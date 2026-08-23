"""Security regressions on the subprocess boundary.

The Bright Data CLI is the one place this application leaves its own process, and
the heal prompt is operator-supplied free text that travels there. Three
properties protect that boundary, and each is asserted twice — once by reading the
source of every module under `app/`, and once by exercising the real adapter with
`asyncio.create_subprocess_exec` intercepted:

1. **No shell, ever.** Argv is a list handed to the OS; there is nothing to
   interpret a `;` or a backtick.
2. **Every process has a timeout, and is killed when it expires.** A hung `heal`
   must not pin a worker for the rest of the demo.
3. **`--auto-approve` is never passed.** The approval gate is the product, so its
   absence is a behavioural claim, not a convention.

The source scan looks redundant until someone adds a fifth CLI call in a hurry on
day six. It is cheap, and it fails on the commit rather than in the demo.
"""

import ast
import asyncio
from collections.abc import Awaitable
from pathlib import Path
from typing import NoReturn

import pytest
from app.config import Settings
from app.domain.validator import ValidationError
from app.infra.cli.bdata import BdataCli
from app.infra.cli.protocol import CliNotAvailable, CliTimeout

APP_DIR = Path(__file__).resolve().parents[2] / "app"

# Anything that hands a string to a command interpreter instead of an argv list.
SHELL_CALLS = frozenset(
    {
        "create_subprocess_shell",
        "asyncio.create_subprocess_shell",
        "os.system",
        "os.popen",
        "subprocess.run",
        "subprocess.call",
        "subprocess.check_output",
        "subprocess.Popen",
    }
)

COLLECTOR_ID = "c_mp3tuab31lswoxvpws"
PROMPT = "Titles moved from article.news-card h2 to div.press-wrapper h3.press-wrapper__heading."


def app_modules() -> list[tuple[str, ast.Module]]:
    """Every module under `app/`, parsed.

    The scan reads the syntax tree rather than the raw text on purpose: `bdata.py`
    explains in prose *why* it never uses a shell and never passes `--auto-approve`,
    and a substring search would flag those sentences. A call is a violation; a
    docstring saying "we do not do this" is the documentation asked for.
    """
    modules = []
    for path in sorted(APP_DIR.rglob("*.py")):
        source = path.read_text(encoding="utf-8")
        modules.append((path.relative_to(APP_DIR.parent).as_posix(), ast.parse(source)))
    return modules


def dotted_name(node: ast.expr) -> str:
    """`asyncio.create_subprocess_exec` from the AST of that expression."""
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return f"{dotted_name(node.value)}.{node.attr}".lstrip(".")
    return ""


def docstring_ids(tree: ast.Module) -> set[int]:
    """Identity of every docstring constant, so prose can be excluded from the scan."""
    ids = set()
    for node in ast.walk(tree):
        if not isinstance(node, ast.Module | ast.ClassDef | ast.FunctionDef | ast.AsyncFunctionDef):
            continue
        first = node.body[0] if node.body else None
        if (
            isinstance(first, ast.Expr)
            and isinstance(first.value, ast.Constant)
            and isinstance(first.value.value, str)
        ):
            ids.add(id(first.value))
    return ids


class TestNoShellAnywhereInTheApplication:
    def test_no_module_calls_a_shell_spawning_function(self):
        offenders = [
            f"{module}: {dotted_name(node.func)}"
            for module, tree in app_modules()
            for node in ast.walk(tree)
            if isinstance(node, ast.Call) and dotted_name(node.func) in SHELL_CALLS
        ]

        assert offenders == []

    def test_no_module_passes_shell_true(self):
        offenders = [
            module
            for module, tree in app_modules()
            for node in ast.walk(tree)
            if isinstance(node, ast.Call)
            for keyword in node.keywords
            if keyword.arg == "shell"
        ]

        assert offenders == []

    def test_auto_approve_is_in_no_argument_the_application_can_build(self):
        # Excluding docstrings, `--auto-approve` must not appear as a string literal
        # anywhere: that is the only way it could reach an argv list.
        offenders = [
            module
            for module, tree in app_modules()
            for node in ast.walk(tree)
            if isinstance(node, ast.Constant)
            and isinstance(node.value, str)
            and "--auto-approve" in node.value
            and id(node) not in docstring_ids(tree)
        ]

        assert offenders == []

    def test_only_one_module_spawns_a_process_at_all(self):
        spawners = sorted(
            {
                module
                for module, tree in app_modules()
                for node in ast.walk(tree)
                if isinstance(node, ast.Call)
                and dotted_name(node.func).endswith("create_subprocess_exec")
            }
        )

        assert spawners == ["app/infra/cli/bdata.py"]


class FakeProcess:
    """Just enough of `asyncio.subprocess.Process` for the adapter to finish."""

    def __init__(self, stdout: str = "[]", exit_code: int = 0, hang: bool = False) -> None:
        self._stdout = stdout.encode()
        self.returncode: int | None = exit_code
        self._hang = hang
        self.killed = False

    async def communicate(self) -> tuple[bytes, bytes]:
        if self._hang:
            await asyncio.sleep(3600)
        return self._stdout, b""

    def kill(self) -> None:
        self.killed = True
        self.returncode = -9

    async def wait(self) -> int:
        return self.returncode if self.returncode is not None else -9


@pytest.fixture
def spawned(monkeypatch):
    """Intercept process creation and record what would have been executed.

    Nothing is spawned, so this runs on a machine with no `brightdata` binary — the
    same property that lets the whole suite run without credentials.
    """
    calls: list[tuple[str, tuple[str, ...]]] = []
    processes: list[FakeProcess] = []
    behaviour = {"stdout": "[]", "hang": False}

    async def fake_exec(program: str, *args: str, **kwargs: object) -> FakeProcess:
        calls.append((program, tuple(args)))
        assert "shell" not in kwargs, "the adapter must never ask for a shell"
        process = FakeProcess(stdout=behaviour["stdout"], hang=bool(behaviour["hang"]))
        processes.append(process)
        return process

    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_exec)
    return {"calls": calls, "processes": processes, "behaviour": behaviour}


@pytest.fixture
def cli(settings: Settings) -> BdataCli:
    return BdataCli(settings)


class TestArgvIsAListNotACommandLine:
    async def test_run_passes_the_binary_and_arguments_separately(self, cli, spawned, settings):
        await cli.run(COLLECTOR_ID, "https://example.test/page.html", label="demo-run")

        program, args = spawned["calls"][0]
        assert program == settings.bdata_binary
        assert args == (
            "scraper",
            "run",
            COLLECTOR_ID,
            "https://example.test/page.html",
            "--name",
            "demo-run",
            "--json",
        )

    async def test_the_collector_id_is_positional_not_a_name_flag(self, cli, spawned):
        # `--name` is a job label. Passing a logical key where the id belongs is the
        # mistake that makes the CLI look broken, so the order is asserted exactly.
        await cli.run(COLLECTOR_ID)

        _, args = spawned["calls"][0]
        assert args[:3] == ("scraper", "run", COLLECTOR_ID)
        assert "--name" not in args

    async def test_the_heal_prompt_is_one_argument_however_it_is_punctuated(self, cli, spawned):
        # Shell metacharacters in the prompt: with argv there is nothing to escape,
        # because there is no shell to escape them from.
        hostile = 'Titles moved to div.press-wrapper h3; rm -rf / `whoami` $(id) "quoted"'
        spawned["behaviour"]["stdout"] = f'{{"collector_id": "{COLLECTOR_ID}", "status": "done"}}'

        await cli.heal(COLLECTOR_ID, hostile)

        _, args = spawned["calls"][0]
        assert args == ("scraper", "heal", COLLECTOR_ID, hostile, "--json")
        assert sum(1 for arg in args if "rm -rf" in arg) == 1

    async def test_a_malicious_collector_id_never_reaches_a_process(self, cli, spawned):
        with pytest.raises(ValidationError):
            await cli.run("c_abc; rm -rf /")

        assert spawned["calls"] == []

    async def test_approve_is_a_bare_apply_with_no_auto_approve_anywhere(self, cli, spawned):
        spawned["behaviour"]["stdout"] = f'{{"collector_id": "{COLLECTOR_ID}", "status": "done"}}'

        await cli.heal(COLLECTOR_ID, PROMPT)
        await cli.approve(COLLECTOR_ID)

        every_argument = [arg for _, args in spawned["calls"] for arg in args]
        assert "--auto-approve" not in every_argument
        assert spawned["calls"][1][1] == ("scraper", "approve", COLLECTOR_ID, "--json")


class TestEveryProcessIsBounded:
    @pytest.mark.parametrize(
        ("action", "arguments"),
        [
            ("run", (COLLECTOR_ID,)),
            ("heal", (COLLECTOR_ID, PROMPT)),
            ("approve", (COLLECTOR_ID,)),
        ],
    )
    async def test_a_hung_cli_is_killed_and_reported(self, cli, spawned, action, arguments):
        # The timeouts are 660 s in production. `asyncio.wait_for` is patched down to
        # a millisecond here so the test asserts the *mechanism* — kill, then raise —
        # rather than waiting eleven minutes to observe it.
        spawned["behaviour"]["hang"] = True
        original = asyncio.wait_for

        async def impatient(awaitable: Awaitable[object], timeout: float) -> object:
            return await original(awaitable, 0.01)

        with pytest.MonkeyPatch.context() as patch:
            patch.setattr(asyncio, "wait_for", impatient)
            with pytest.raises(CliTimeout) as raised:
                await getattr(cli, action)(*arguments)

        assert spawned["processes"][0].killed is True
        assert tuple(raised.value.argv[:2]) == ("scraper", action)

    async def test_a_missing_binary_says_how_to_install_it(self, cli, monkeypatch):
        # The most common first-run failure. A `FileNotFoundError` traceback would
        # send someone reading our source instead of running two documented commands.
        async def missing(*_args: object, **_kwargs: object) -> NoReturn:
            raise FileNotFoundError

        monkeypatch.setattr(asyncio, "create_subprocess_exec", missing)

        with pytest.raises(CliNotAvailable) as raised:
            await cli.run(COLLECTOR_ID)

        assert "npm install -g @brightdata/cli" in str(raised.value)
        assert "brightdata login" in str(raised.value)
