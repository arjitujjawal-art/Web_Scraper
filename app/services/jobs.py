"""Background execution for CLI operations that take minutes, not milliseconds.

`brightdata scraper heal` blocks for up to 600 seconds. No HTTP request may wait
for that, so every admin operation is a two-step exchange: `POST` records a job
row and returns `202 Accepted` with a `run_id`, and the client polls
`GET /api/collector-runs/{run_id}`. See `docs/adr/0001-async-cli-jobs.md`.

This is an in-process runner — `asyncio.create_task` plus a semaphore — not
Celery and not a broker. For a single-node demo that is the honest choice, and the
cost is stated plainly: jobs do not survive a restart, and a process killed
mid-heal leaves a row in RUNNING. The README lists that under Known Limitations
rather than hiding it.
"""

import asyncio
import logging
from collections.abc import Awaitable, Callable

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.config import Settings
from app.domain.enums import CollectorAction, RunStatus
from app.domain.validator import validate_heal_prompt
from app.infra.cli.protocol import ScraperCli
from app.infra.db.models import CollectorRunRow
from app.infra.db.repositories import CollectorRunRepository
from app.infra.db.session import session_scope
from app.infra.registry import CollectorRegistry, CollectorSpec
from app.services.clock import Clock, utcnow
from app.services.errors import (
    CollectorDisabled,
    CollectorNotProvisioned,
    NothingToApprove,
)
from app.services.healing import HealingService
from app.services.ingest import IngestService

logger = logging.getLogger(__name__)

Job = Callable[[AsyncSession], Awaitable[None]]

# Failure text is stored in a Text column and rendered on the dashboard; a
# multi-megabyte stack trace helps nobody there.
_ERROR_TEXT_LIMIT = 2000


class JobRunner:
    """Owns the background tasks and the concurrency limit.

    The semaphore defaults to 1. Bright Data's AI-Flow allows 3 concurrent
    create/heal jobs per account, but serialising them keeps a live demo
    deterministic and leaves headroom for manual CLI use while judging.
    """

    def __init__(self, session_factory: async_sessionmaker[AsyncSession], limit: int = 1) -> None:
        self._session_factory = session_factory
        self._semaphore = asyncio.Semaphore(limit)
        self._tasks: set[asyncio.Task[None]] = set()

    @property
    def active_jobs(self) -> int:
        """Tasks not yet finished, reported by `GET /api/health`."""
        return sum(1 for task in self._tasks if not task.done())

    def submit(self, run_id: str, job: Job) -> None:
        """Schedule `job` to run with its own database session.

        A fresh session per job, rather than the request's: the request's session
        closes as soon as the 202 is written.
        """
        task = asyncio.create_task(self._guarded(run_id, job), name=f"job:{run_id}")
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    async def shutdown(self) -> None:
        """Cancel outstanding jobs on application shutdown.

        Without this, a reload leaves orphaned subprocesses holding Bright Data job
        slots — with an account cap of 3, that breaks the next demo run.
        """
        for task in list(self._tasks):
            task.cancel()
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)
        self._tasks.clear()

    async def _guarded(self, run_id: str, job: Job) -> None:
        """Run one job, and make sure its row never stays RUNNING forever.

        Any exception — CLI failure, timeout, a bug in ingest — is recorded on the
        run row before being logged. A job that dies silently is indistinguishable
        from a collector that is merely slow, which is the one thing a health
        dashboard must never allow.
        """
        async with self._semaphore:
            try:
                async with session_scope(self._session_factory) as session:
                    await job(session)
            except asyncio.CancelledError:
                await self._mark_failed(run_id, "cancelled by application shutdown")
                raise
            except Exception as exc:  # the boundary of a background task
                logger.exception("job.failed", extra={"run_id": run_id})
                await self._mark_failed(run_id, f"{type(exc).__name__}: {exc}")

    async def _mark_failed(self, run_id: str, reason: str) -> None:
        """Best-effort failure recording, in a fresh transaction.

        The job's own session is already rolled back by the time we get here, so this
        needs a new one. Wrapped defensively: if the database is what failed, a second
        exception here would replace a useful log line with a useless one.
        """
        try:
            async with session_scope(self._session_factory) as session:
                row = await CollectorRunRepository(session).get(run_id)
                if row is None or row.status.is_terminal:
                    return
                row.status = RunStatus.FAILED
                row.error = reason[:_ERROR_TEXT_LIMIT]
                row.finished_at = utcnow()
        except Exception:  # never mask the original failure
            logger.exception("job.failure_recording_failed", extra={"run_id": run_id})


class JobDispatcher:
    """Turns an admin request into a queued job row plus a background task.

    Route handlers call exactly one method here and return its `run_id`. All wiring
    of sessions, services and the CLI lives in this class, which is what keeps the
    handlers down to a few lines each.
    """

    def __init__(
        self,
        *,
        runner: JobRunner,
        session_factory: async_sessionmaker[AsyncSession],
        cli: ScraperCli,
        registry: CollectorRegistry,
        settings: Settings,
        clock: Clock = utcnow,
    ) -> None:
        self._runner = runner
        self._session_factory = session_factory
        self._cli = cli
        self._registry = registry
        self._settings = settings
        self._clock = clock

    async def dispatch_run(self, collector_key: str, url: str | None = None) -> CollectorRunRow:
        """Queue a collector run.

        `url` must be one of the collector's registered URLs — the registry rejects
        anything else. That is how the demo runs one collector against two pages
        without this endpoint ever accepting an arbitrary address.
        """
        self._require_runnable(collector_key)
        target = self._registry.resolve_url(collector_key, url)
        row = await self._queue(CollectorAction.RUN, collector_key, target_url=target)
        run_id = row.run_id

        async def job(session: AsyncSession) -> None:
            await self._ingest(session).execute_run(run_id)

        self._runner.submit(run_id, job)
        return row

    async def dispatch_heal(self, collector_key: str, prompt: str) -> CollectorRunRow:
        """Queue a heal request. The prompt is validated before the row is written."""
        self._require_runnable(collector_key)
        text = validate_heal_prompt(prompt)
        row = await self._queue(CollectorAction.HEAL, collector_key, heal_prompt=text)
        run_id = row.run_id

        async def job(session: AsyncSession) -> None:
            await self._healing(session).execute_heal(run_id)

        self._runner.submit(run_id, job)
        return row

    async def dispatch_approve(self, collector_key: str) -> CollectorRunRow:
        """Queue approval of a pending repair, refusing early if none is pending.

        Checked against our own run history rather than the CLI: asking Bright Data
        would cost up to 600 seconds to learn the same thing.
        """
        self._require_runnable(collector_key)
        async with session_scope(self._session_factory) as session:
            pending = await CollectorRunRepository(session).latest_awaiting_approval(collector_key)
        if pending is None:
            raise NothingToApprove(
                f"collector {collector_key!r} has no repair awaiting approval; POST /heal first"
            )

        row = await self._queue(CollectorAction.APPROVE, collector_key)
        run_id = row.run_id

        async def job(session: AsyncSession) -> None:
            await self._healing(session).execute_approve(run_id)

        self._runner.submit(run_id, job)
        return row

    # -- internals ---------------------------------------------------------

    async def _queue(
        self,
        action: CollectorAction,
        collector_key: str,
        *,
        target_url: str | None = None,
        heal_prompt: str | None = None,
    ) -> CollectorRunRow:
        """Write the QUEUED row and commit it before the 202 is returned.

        Committing first matters: a client that polls immediately must find the row,
        not a 404 caused by a race with its own background task.
        """
        spec = self._registry.get(collector_key)
        async with session_scope(self._session_factory) as session:
            return await CollectorRunRepository(session).add(
                CollectorRunRow(
                    collector_key=spec.key,
                    collector_id=spec.collector_id,
                    action=action,
                    status=RunStatus.QUEUED,
                    target_url=target_url,
                    heal_prompt=heal_prompt,
                    started_at=self._clock(),
                )
            )

    def _require_runnable(self, collector_key: str) -> CollectorSpec:
        """Refuse a collector that is disabled or not yet created.

        Both failures are configuration, not runtime: catching them here turns a
        confusing CLI error ten minutes later into an immediate, explanatory 409.
        """
        spec = self._registry.get(collector_key)
        if not spec.enabled:
            raise CollectorDisabled(f"collector {collector_key!r} is disabled in the registry")
        if not spec.is_provisioned:
            raise CollectorNotProvisioned(
                f"collector {collector_key!r} has no collector_id yet. Create it with "
                "`brightdata scraper create` and record the id in collectors/registry.yaml."
            )
        return spec

    def _ingest(self, session: AsyncSession) -> IngestService:
        return IngestService(
            session=session,
            cli=self._cli,
            registry=self._registry,
            settings=self._settings,
            clock=self._clock,
        )

    def _healing(self, session: AsyncSession) -> HealingService:
        return HealingService(
            session=session,
            cli=self._cli,
            registry=self._registry,
            settings=self._settings,
            clock=self._clock,
        )
