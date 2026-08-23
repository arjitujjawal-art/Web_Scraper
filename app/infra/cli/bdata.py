"""The real Bright Data CLI adapter.

Every process here is spawned with `asyncio.create_subprocess_exec` and an **argv
list**. There is no shell, no string interpolation, and no `shell=True` anywhere
in this file — see `docs/adr/0002-argv-subprocess-no-shell.md`. A collector id
containing `; rm -rf /` would be passed to the binary as one meaningless
argument and rejected by it, because it is never parsed by a shell in the first
place.

Every process also has a timeout and is killed when it expires. The timeouts are
large — 660 s — because `heal` and `approve` legitimately block for up to 600 s
on Bright Data's side. A 30 s timeout, which an earlier draft of this spec used,
would abort every real heal at the ten-percent mark.
"""

import asyncio
import logging
import time
from collections.abc import Sequence

from app.config import Settings
from app.domain.validator import validate_collector_id, validate_heal_prompt
from app.infra.cli.parsers import parse_job_output, parse_run_output
from app.infra.cli.protocol import (
    CliFailure,
    CliJobStatus,
    CliNotAvailable,
    CliResult,
    CliTimeout,
    JobOutcome,
    RunOutcome,
)

logger = logging.getLogger(__name__)

# stderr can carry a long AI-Flow progress trace; only the tail is useful in an
# error message and the rest would bloat every stored run row.
_STDERR_EXCERPT_CHARS = 800


class BdataCli:
    """`ScraperCli` implementation backed by the `brightdata` binary.

    Structurally satisfies the Protocol; no inheritance, so a test double is never
    forced to import this module or its dependencies.
    """

    def __init__(self, settings: Settings) -> None:
        self._binary = settings.bdata_binary
        self._run_timeout = settings.cli_run_timeout
        self._heal_timeout = settings.cli_heal_timeout
        self._approve_timeout = settings.cli_approve_timeout

    async def run(
        self,
        collector_id: str,
        url: str | None = None,
        *,
        label: str | None = None,
    ) -> RunOutcome:
        """Execute a collector.

        The collector id is **positional** — `scraper run <collector_id> [url]`.
        `--name` is a job label, not a selector; passing a logical name where an id
        belongs is the mistake that makes the CLI look broken.

        `url` comes from `collectors/registry.yaml`, never from a client request.
        That is what closes the SSRF hole: there is no code path from an HTTP body
        to this argument.
        """
        cid = validate_collector_id(collector_id)
        argv = ["scraper", "run", cid]
        if url:
            argv.append(url)
        if label:
            argv += ["--name", label]
        argv.append("--json")

        result = await self._exec(argv, self._run_timeout)
        self._raise_for_exit(result, action="run")

        outcome = parse_run_output(result.stdout, cid)
        return RunOutcome(
            collector_id=cid,
            rows=outcome.rows,
            argv=result.argv,
            duration_seconds=result.duration_seconds,
        )

    async def create(
        self,
        url: str,
        prompt: str,
        *,
        name: str | None = None,
    ) -> JobOutcome:
        """Create an on-demand collector on Scraper Studio."""
        text = validate_heal_prompt(prompt)
        argv = ["scraper", "create", url, text, "--json"]
        if name:
            argv.extend(["--name", name])
        result = await self._exec(argv, self._heal_timeout)
        self._raise_for_exit(result, action="create")
        return self._finish(result, "new_collector", action="create")

    async def heal(self, collector_id: str, prompt: str) -> JobOutcome:
        """Request a repair, describing the breakage in plain English.

        `--auto-approve` is deliberately never passed. The approval gate is the
        product: a repair a human inspected is the difference between "self-healing
        scraper" and "scraper that silently changed its own output".
        """
        cid = validate_collector_id(collector_id)
        text = validate_heal_prompt(prompt)

        result = await self._exec(["scraper", "heal", cid, text, "--json"], self._heal_timeout)
        self._raise_for_exit(result, action="heal")
        return self._finish(result, cid, action="heal")

    async def approve(self, collector_id: str) -> JobOutcome:
        """Apply a repair that is awaiting approval. `--reject` discards instead."""
        cid = validate_collector_id(collector_id)

        result = await self._exec(["scraper", "approve", cid, "--json"], self._approve_timeout)
        self._raise_for_exit(result, action="approve")
        return self._finish(result, cid, action="approve")

    # -- internals ---------------------------------------------------------

    async def _exec(self, args: Sequence[str], timeout: float) -> CliResult:
        """Spawn the CLI and collect its output, or kill it on timeout.

        `create_subprocess_exec` takes the program and its arguments separately, so
        the operating system hands the argv straight to the binary. There is no
        intermediate shell to interpret quotes, semicolons or backticks.
        """
        argv = tuple(args)
        # Logged as a list: a joined command line in a log file is an invitation to
        # paste it into a terminal, and the heal prompt is user-supplied text.
        logger.info("cli.exec", extra={"binary": self._binary, "argv": list(argv)})

        started = time.monotonic()
        try:
            process = await asyncio.create_subprocess_exec(
                self._binary,
                *argv,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
        except FileNotFoundError as exc:
            raise CliNotAvailable(
                f"{self._binary!r} not found on PATH. Install it with "
                "`npm install -g @brightdata/cli` and run `brightdata login`.",
                argv=argv,
            ) from exc

        try:
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout)
        except TimeoutError:
            process.kill()
            await process.wait()
            logger.warning("cli.timeout", extra={"argv": list(argv), "timeout": timeout})
            raise CliTimeout(timeout, argv=argv) from None

        return CliResult(
            argv=argv,
            exit_code=process.returncode if process.returncode is not None else -1,
            stdout=stdout.decode("utf-8", errors="replace"),
            stderr=stderr.decode("utf-8", errors="replace"),
            duration_seconds=round(time.monotonic() - started, 3),
        )

    def _raise_for_exit(self, result: CliResult, *, action: str) -> None:
        if result.ok:
            return
        detail = _excerpt(result.stderr) or _excerpt(result.stdout) or "no output"
        raise CliFailure(
            f"`scraper {action}` exited {result.exit_code}: {detail}",
            exit_code=result.exit_code,
            argv=result.argv,
        )

    def _finish(self, result: CliResult, collector_id: str, *, action: str) -> JobOutcome:
        """Parse an envelope and reject a reported failure even on exit code 0.

        The CLI can exit successfully while the *job* failed; the envelope is the
        authority, not the exit code.
        """
        outcome = parse_job_output(result.stdout, collector_id)
        if outcome.status is CliJobStatus.FAILED:
            raise CliFailure(
                f"`scraper {action}` reported status=failed: {outcome.error or 'no reason given'}",
                argv=result.argv,
            )

        logger.info(
            "cli.job",
            extra={
                "action": action,
                "collector_id": outcome.collector_id,
                "status": str(outcome.status),
                "duration_seconds": result.duration_seconds,
            },
        )
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
            argv=result.argv,
            duration_seconds=result.duration_seconds,
            extra=outcome.extra,
        )


def _excerpt(text: str) -> str:
    """Trim CLI output to something that fits in an error message and a DB column."""
    cleaned = text.strip()
    if len(cleaned) <= _STDERR_EXCERPT_CHARS:
        return cleaned
    return f"...{cleaned[-_STDERR_EXCERPT_CHARS:]}"
