"""The seam between this application and the Bright Data CLI.

Everything above `infra/cli` depends on the `ScraperCli` Protocol, never on the
subprocess. That is what lets the entire pipeline — ingest, health assessment,
the whole degrade → heal → approve → recover cycle — be tested with no API key,
no network and no `brightdata` binary installed, by swapping in `FakeCli`.

Two result shapes exist because the CLI has two. `scraper run --json` prints a
**bare JSON array** of best-effort rows; `scraper create/heal/approve --json`
print a **status envelope**. Collapsing them into one type would mean a union of
optional fields that no caller could reason about.
"""

from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any, Protocol, runtime_checkable


class CliJobStatus(StrEnum):
    """Status values the CLI reports in a create/heal/approve envelope.

    `AWAITING_APPROVAL` is a *success*: the healer produced a candidate repair and
    is waiting for a human. Treating it as a failure — which any naive
    `status == "done"` check does — breaks the approval gate that the demo is
    built around.
    """

    QUEUED = "queued"
    RUNNING = "running"
    AWAITING_APPROVAL = "awaiting_approval"
    DONE = "done"
    FAILED = "failed"
    REJECTED = "rejected"
    UNKNOWN = "unknown"

    @property
    def is_terminal(self) -> bool:
        """Whether no further CLI progress is expected without human input."""
        return self in {
            CliJobStatus.AWAITING_APPROVAL,
            CliJobStatus.DONE,
            CliJobStatus.FAILED,
            CliJobStatus.REJECTED,
        }

    @property
    def is_success(self) -> bool:
        """Whether the command did what it was asked to do."""
        return self in {CliJobStatus.AWAITING_APPROVAL, CliJobStatus.DONE}


@dataclass(frozen=True, slots=True)
class CliResult:
    """Raw process outcome, before any JSON is interpreted."""

    argv: tuple[str, ...]
    exit_code: int
    stdout: str
    stderr: str
    duration_seconds: float

    @property
    def ok(self) -> bool:
        """Whether the process exited cleanly."""
        return self.exit_code == 0


@dataclass(frozen=True, slots=True)
class RunOutcome:
    """Parsed `scraper run` output: the scraped rows, as the collector emitted them.

    Rows are kept as raw mappings rather than being normalized here. Normalization
    is domain logic and belongs in `app/domain/normalizer.py`; this layer's only
    job is to turn bytes into dictionaries.
    """

    collector_id: str
    rows: tuple[Mapping[str, Any], ...]
    argv: tuple[str, ...] = ()
    duration_seconds: float = 0.0

    @property
    def record_count(self) -> int:
        """How many rows the collector returned."""
        return len(self.rows)


@dataclass(frozen=True, slots=True)
class JobOutcome:
    """Parsed create/heal/approve envelope.

    `preview_rows` and `diff_summary` are populated only on an `awaiting_approval`
    heal. They are the payload behind "show the proposed repair before applying
    it" — the screen a judge actually looks at.
    """

    collector_id: str
    status: CliJobStatus
    completed_steps: tuple[str, ...] = ()
    view_url: str | None = None
    created_at: str | None = None
    error: str | None = None
    diff_summary: str | None = None
    next_step: str | None = None
    preview_rows: tuple[Mapping[str, Any], ...] = ()
    argv: tuple[str, ...] = ()
    duration_seconds: float = 0.0
    extra: Mapping[str, Any] = field(default_factory=dict)

    @property
    def needs_approval(self) -> bool:
        """Whether a human still has to approve the proposed repair."""
        return self.status is CliJobStatus.AWAITING_APPROVAL


class CliError(RuntimeError):
    """Base class for every failure originating at the CLI boundary.

    A single base lets `api/errors.py` map the whole family to one HTTP envelope
    instead of leaking subprocess vocabulary into responses.
    """

    def __init__(self, message: str, *, argv: Sequence[str] = ()) -> None:
        super().__init__(message)
        # Stored as a list, never joined into a string: a joined command line in a
        # log invites someone to paste it into a shell, which is the habit that
        # produced the injection this layer exists to prevent.
        self.argv: list[str] = list(argv)


class CliNotAvailable(CliError):
    """The `brightdata` binary is not installed or not on PATH."""


class CliTimeout(CliError):
    """The command exceeded its configured timeout and was killed."""

    def __init__(self, timeout: float, *, argv: Sequence[str] = ()) -> None:
        super().__init__(f"CLI command exceeded {timeout:.0f}s and was terminated", argv=argv)
        self.timeout = timeout


class CliFailure(CliError):
    """The command exited non-zero, or reported `status: failed`."""

    def __init__(self, message: str, *, exit_code: int = 1, argv: Sequence[str] = ()) -> None:
        super().__init__(message, argv=argv)
        self.exit_code = exit_code


class CliOutputError(CliError):
    """Output could not be parsed as the shape the command promised.

    Surfaced as a failed run with the offending text attached, never as a crash:
    a CLI version bump that changes the envelope should show up on the dashboard,
    not as a 500.
    """


@runtime_checkable
class ScraperCli(Protocol):
    """The three Bright Data operations this application performs.

    `create` is deliberately absent. Collectors are created once, by hand, and
    their server-generated `c_*` ids are committed to `collectors/registry.yaml`.
    Creation takes 5-25 minutes and is not something an HTTP request should start.
    """

    async def run(
        self,
        collector_id: str,
        url: str | None = None,
        *,
        label: str | None = None,
    ) -> RunOutcome:
        """Execute a collector, optionally against a specific URL."""
        ...

    async def heal(self, collector_id: str, prompt: str) -> JobOutcome:
        """Ask Scraper Studio to repair a collector, describing what changed."""
        ...

    async def approve(self, collector_id: str) -> JobOutcome:
        """Apply a repair that is awaiting approval."""
        ...
