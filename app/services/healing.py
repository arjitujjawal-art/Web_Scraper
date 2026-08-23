"""Healing: request a repair, review it, apply it.

Detection lives in `domain/validator.py` and marks a collector DEGRADED. Nothing
here is triggered automatically — a human reads the fill-rate drop and decides to
heal. That is a product decision, not an omission
(`docs/adr/0004-manual-healing-only.md`): an auto-heal would repair the collector
before anyone could see it break, which destroys the one thing this submission has
to demonstrate.

The state machine, as stored on `collector_runs.health`:

    HEALTHY --(mutated page)--> DEGRADED --(POST /heal)--> HEALING_REVIEW
            --(POST /approve)--> HEALED --(POST /run)--> HEALTHY
"""

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.domain.enums import CollectorHealth, RunStatus
from app.infra.cli.protocol import CliError, CliJobStatus, JobOutcome, ScraperCli
from app.infra.db.models import CollectorRunRow
from app.infra.db.repositories import CollectorRunRepository
from app.infra.registry import CollectorRegistry
from app.services.clock import Clock, utcnow
from app.services.errors import CollectorNotProvisioned, NothingToApprove, RunNotFound

logger = logging.getLogger(__name__)

# How a CLI job status maps onto collector health. `awaiting_approval` is a
# success, not a failure: the repair exists and is waiting for a human.
_HEALTH_BY_CLI_STATUS = {
    CliJobStatus.AWAITING_APPROVAL: CollectorHealth.HEALING_REVIEW,
    CliJobStatus.DONE: CollectorHealth.HEALED,
    CliJobStatus.REJECTED: CollectorHealth.DEGRADED,
    CliJobStatus.FAILED: CollectorHealth.FAILED,
}


class HealingService:
    """Drives `scraper heal` and `scraper approve` against a stored job row."""

    def __init__(
        self,
        *,
        session: AsyncSession,
        cli: ScraperCli,
        registry: CollectorRegistry,
        settings: Settings,
        clock: Clock = utcnow,
    ) -> None:
        self._session = session
        self._cli = cli
        self._registry = registry
        self._settings = settings
        self._clock = clock
        self._runs = CollectorRunRepository(session)

    async def execute_heal(self, run_id: str) -> CollectorRunRow:
        """Send the healing prompt and record whatever comes back.

        The prompt was already validated when the job was queued, so a 1001-character
        instruction fails with a 422 at request time rather than after a CLI round
        trip.
        """
        row, collector_id = await self._prepare(run_id)
        prompt = row.heal_prompt or ""

        try:
            outcome = await self._cli.heal(collector_id, prompt)
        except CliError as exc:
            return self._fail(row, exc)

        self._apply(row, outcome)
        logger.info(
            "healing.heal_completed",
            extra={
                "run_id": row.run_id,
                "collector_key": row.collector_key,
                "cli_status": str(outcome.status),
                "preview_rows": len(outcome.preview_rows),
            },
        )
        return row

    async def execute_approve(self, run_id: str) -> CollectorRunRow:
        """Apply the pending repair.

        The pending heal is re-checked here, not only at queue time: between the 202
        and this task acquiring the semaphore, someone may have approved it from the
        terminal.
        """
        row, collector_id = await self._prepare(run_id)

        pending = await self._runs.latest_awaiting_approval(row.collector_key)
        if pending is None:
            row.status = RunStatus.FAILED
            row.error = "no repair awaiting approval at execution time"
            row.finished_at = self._clock()
            raise NothingToApprove(row.error)

        try:
            outcome = await self._cli.approve(collector_id)
        except CliError as exc:
            return self._fail(row, exc)

        self._apply(row, outcome)
        # The heal row stops being the pending one once its repair is applied, so a
        # second approve cannot be queued against it.
        pending.cli_status = str(outcome.status)
        pending.health = row.health
        logger.info(
            "healing.approve_completed",
            extra={
                "run_id": row.run_id,
                "collector_key": row.collector_key,
                "cli_status": str(outcome.status),
            },
        )
        return row

    # -- internals ---------------------------------------------------------

    async def _prepare(self, run_id: str) -> tuple[CollectorRunRow, str]:
        row = await self._runs.get(run_id)
        if row is None:
            raise RunNotFound(f"run {run_id!r} does not exist")

        spec = self._registry.get(row.collector_key)
        if not spec.is_provisioned:
            raise CollectorNotProvisioned(f"collector {spec.key!r} has no collector_id")

        row.status = RunStatus.RUNNING
        await self._session.flush()
        return row, spec.collector_id

    def _apply(self, row: CollectorRunRow, outcome: JobOutcome) -> None:
        """Copy an envelope onto the run row.

        `preview_rows` and `diff_summary` are stored, not just logged: they are the
        proposed repair, and the review screen renders them straight from here.
        """
        row.status = RunStatus.SUCCEEDED if outcome.status.is_success else RunStatus.FAILED
        row.health = _HEALTH_BY_CLI_STATUS.get(outcome.status, CollectorHealth.UNKNOWN)
        row.cli_status = str(outcome.status)
        row.view_url = outcome.view_url
        row.diff_summary = outcome.diff_summary
        row.next_step = outcome.next_step
        row.preview_rows = [dict(preview) for preview in outcome.preview_rows] or None
        row.error = outcome.error
        row.finished_at = self._clock()
        row.duration_seconds = outcome.duration_seconds or None

    def _fail(self, row: CollectorRunRow, exc: CliError) -> CollectorRunRow:
        row.status = RunStatus.FAILED
        row.health = CollectorHealth.FAILED
        row.error = str(exc)[:2000]
        row.finished_at = self._clock()
        logger.warning(
            "healing.cli_failed",
            extra={"run_id": row.run_id, "collector_key": row.collector_key, "argv": exc.argv},
        )
        return row
