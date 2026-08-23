"""A CLI double that replays recorded output.

This is the file that makes the claim "the whole pipeline is testable with no API
key and no network" true. `FakeCli` satisfies the same `ScraperCli` Protocol as
`BdataCli`, applies the *same* input validation, and returns bytes captured from
real CLI invocations (`tests/fixtures/cli/*.json`).

It is deliberately strict in two ways:

* an un-queued call raises `AssertionError`, not a `CliError` — a test that
  forgot to script a step should fail loudly rather than exercise the service's
  error path by accident;
* every call is recorded in `calls`, so a test can assert what was passed —
  including that `--auto-approve` never appears in any argv.
"""

from collections import deque
from collections.abc import Sequence
from dataclasses import dataclass, field
from pathlib import Path

from app.domain.validator import validate_collector_id, validate_heal_prompt
from app.infra.cli.parsers import parse_job_output, parse_run_output
from app.infra.cli.protocol import JobOutcome, RunOutcome

FIXTURE_DIR = Path(__file__).resolve().parents[3] / "tests" / "fixtures" / "cli"

_Queued = str | BaseException


@dataclass(frozen=True, slots=True)
class RecordedCall:
    """One invocation, as the fake saw it."""

    action: str
    collector_id: str
    url: str | None = None
    prompt: str | None = None
    label: str | None = None


@dataclass
class FakeCli:
    """Scripted `ScraperCli`. Queue responses in the order they should be returned."""

    fixture_dir: Path = FIXTURE_DIR
    calls: list[RecordedCall] = field(default_factory=list)
    _runs: deque[_Queued] = field(default_factory=deque, repr=False)
    _heals: deque[_Queued] = field(default_factory=deque, repr=False)
    _approvals: deque[_Queued] = field(default_factory=deque, repr=False)

    # -- scripting ---------------------------------------------------------

    def load(self, name: str) -> str:
        """Read a recorded payload by fixture name, e.g. `heal_awaiting_approval`."""
        path = self.fixture_dir / f"{name}.json"
        if not path.is_file():
            raise AssertionError(f"CLI fixture not found: {path}")
        return path.read_text(encoding="utf-8")

    def enqueue_run(self, *payloads: _Queued) -> "FakeCli":
        """Queue raw stdout strings, fixture names, or exceptions to raise."""
        self._runs.extend(self._resolve(payload) for payload in payloads)
        return self

    def enqueue_heal(self, *payloads: _Queued) -> "FakeCli":
        """Queue heal responses, in the order they should be returned."""
        self._heals.extend(self._resolve(payload) for payload in payloads)
        return self

    def enqueue_approve(self, *payloads: _Queued) -> "FakeCli":
        """Queue approve responses, in the order they should be returned."""
        self._approvals.extend(self._resolve(payload) for payload in payloads)
        return self

    def script_healing_demo(self) -> "FakeCli":
        """Queue the eight-step demo: healthy run, broken run, heal, approve, recovery.

        Encoded here rather than in each test so `docs/DEMO_SCRIPT.md` and the
        integration suite cannot drift apart.
        """
        return (
            self.enqueue_run("run_healthy", "run_degraded", "run_healthy")
            .enqueue_heal("heal_awaiting_approval")
            .enqueue_approve("approve_done")
        )

    def _resolve(self, payload: _Queued) -> _Queued:
        """Treat a bare identifier as a fixture name, anything else as literal stdout."""
        if isinstance(payload, str) and not payload.lstrip().startswith(("[", "{")):
            return self.load(payload)
        return payload

    # -- ScraperCli --------------------------------------------------------

    async def run(
        self,
        collector_id: str,
        url: str | None = None,
        *,
        label: str | None = None,
    ) -> RunOutcome:
        """Replay the next queued run payload, validating the id as the real adapter does."""
        cid = validate_collector_id(collector_id)
        self.calls.append(RecordedCall("run", cid, url=url, label=label))
        stdout = _next(self._runs, "run")
        outcome = parse_run_output(stdout, cid)
        return RunOutcome(collector_id=cid, rows=outcome.rows, argv=("scraper", "run", cid))

    async def heal(self, collector_id: str, prompt: str) -> JobOutcome:
        """Replay the next queued heal payload, after the same prompt validation."""
        cid = validate_collector_id(collector_id)
        text = validate_heal_prompt(prompt)
        self.calls.append(RecordedCall("heal", cid, prompt=text))
        return self._job(_next(self._heals, "heal"), cid, "heal")

    async def approve(self, collector_id: str) -> JobOutcome:
        """Replay the next queued approve payload."""
        cid = validate_collector_id(collector_id)
        self.calls.append(RecordedCall("approve", cid))
        return self._job(_next(self._approvals, "approve"), cid, "approve")

    def _job(self, stdout: str, collector_id: str, action: str) -> JobOutcome:
        outcome = parse_job_output(stdout, collector_id)
        return JobOutcome(
            collector_id=outcome.collector_id,
            status=outcome.status,
            completed_steps=outcome.completed_steps,
            view_url=outcome.view_url,
            created_at=outcome.created_at,
            error=outcome.error,
            diff_summary=outcome.diff_summary,
            next_step=outcome.next_step,
            preview_rows=outcome.preview_rows,
            argv=("scraper", action, collector_id),
            extra=outcome.extra,
        )

    # -- assertions helpers ------------------------------------------------

    def actions(self) -> tuple[str, ...]:
        """The sequence of operations performed, for asserting demo order."""
        return tuple(call.action for call in self.calls)

    def prompts(self) -> tuple[str, ...]:
        """Every heal prompt received, to assert what was sent to Scraper Studio."""
        return tuple(call.prompt for call in self.calls if call.prompt is not None)


def _next(queue: deque[_Queued], action: str) -> str:
    if not queue:
        raise AssertionError(
            f"FakeCli received an unscripted `{action}` call — "
            f"queue one with enqueue_{action}(...) or script_healing_demo()"
        )
    payload = queue.popleft()
    if isinstance(payload, BaseException):
        raise payload
    return payload


def fixture_names(fixture_dir: Path = FIXTURE_DIR) -> Sequence[str]:
    """Available recorded fixtures, for a self-check test that they all parse."""
    return sorted(path.stem for path in fixture_dir.glob("*.json"))
