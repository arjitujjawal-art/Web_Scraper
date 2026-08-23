"""Collector run → stored signals, with a quality verdict attached.

The order of operations here is deliberate and is the whole reason the healing
demo is observable:

1. run the collector and keep the rows exactly as they arrived;
2. **measure** required-field coverage on those raw rows;
3. only then normalize, and record what was rejected and why;
4. store the survivors.

Measuring before normalizing is what makes a layout change visible. Normalize
first and a page whose titles moved simply yields fewer signals — a quiet
under-report. Measure first and the fill rate drops from 1.0 to 0.5, which is an
event someone can be shown.
"""

import json
import logging
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.domain.enums import CollectorHealth, RunStatus
from app.domain.models import RawRecord
from app.domain.normalizer import normalize_batch
from app.domain.validator import assess_health, build_run_report, describe_degradation
from app.infra.cli.protocol import CliError, RunOutcome, ScraperCli
from app.infra.db.models import CollectorRunRow
from app.infra.db.repositories import CollectorRunRepository, SignalRepository
from app.infra.registry import CollectorRegistry, CollectorSpec
from app.services.clock import Clock, utcnow
from app.services.errors import CollectorNotProvisioned, RunNotFound

logger = logging.getLogger(__name__)


class IngestService:
    """Executes one collector run and turns it into stored evidence."""

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
        self._signals = SignalRepository(session)

    async def execute_run(self, run_id: str) -> CollectorRunRow:
        """Carry a QUEUED run row through to a terminal state.

        Raises only if the row itself is missing. Every other failure — CLI error,
        timeout, unparseable output — is recorded on the row and returned, because a
        failed collector is data the dashboard needs, not an exception a background
        task should propagate.
        """
        row = await self._runs.get(run_id)
        if row is None:
            raise RunNotFound(f"run {run_id!r} does not exist")

        spec = self._registry.get(row.collector_key)
        if not spec.is_provisioned:
            raise CollectorNotProvisioned(f"collector {spec.key!r} has no collector_id")

        row.status = RunStatus.RUNNING
        await self._session.flush()

        try:
            outcome = await self._cli.run(
                spec.collector_id,
                row.target_url,
                label=f"{spec.key}-{row.run_id}",
            )
        except CliError as exc:
            return self._fail(row, exc)

        return await self._ingest(row, spec, outcome)

    async def _ingest(
        self,
        row: CollectorRunRow,
        spec: CollectorSpec,
        outcome: RunOutcome,
    ) -> CollectorRunRow:
        now = self._clock()
        records = tuple(
            RawRecord(
                fields=dict(fields),
                collector_key=spec.key,
                source_url=row.target_url or spec.primary_url,
            )
            for fields in outcome.rows
        )

        # Step 2: coverage on the raw rows, before anything is discarded.
        normalization = normalize_batch(records, spec.source_type, now, spec.city_hint)
        report = build_run_report(
            records,
            spec.required_fields,
            rejected_records=normalization.rejected_count,
            rejection_reasons=normalization.reasons(),
        )

        stored = await self._signals.upsert_many(normalization.signals)

        row.apply_report(report)
        row.records_stored = stored
        row.status = RunStatus.SUCCEEDED
        row.health = assess_health(report, self._settings.fill_rate_threshold)
        row.cli_status = "done"
        row.notes = describe_degradation(report) if row.health is CollectorHealth.DEGRADED else None
        row.finished_at = now
        row.duration_seconds = outcome.duration_seconds or None
        row.raw_payload_path = self._persist_raw(row.run_id, outcome)

        logger.info(
            "ingest.completed",
            extra={
                "run_id": row.run_id,
                "collector_key": spec.key,
                "records_found": report.records_found,
                "records_stored": stored,
                "fill_rate": report.fill_rate,
                "health": str(row.health),
            },
        )
        return row

    def _fail(self, row: CollectorRunRow, exc: CliError) -> CollectorRunRow:
        """Record a CLI failure as a FAILED run rather than raising.

        `CollectorHealth.FAILED` is distinct from `DEGRADED` on purpose: degraded
        means the collector ran and returned poor data, which healing can fix.
        Failed means it did not run at all, which healing cannot.
        """
        row.status = RunStatus.FAILED
        row.health = CollectorHealth.FAILED
        row.error = str(exc)[:2000]
        row.finished_at = self._clock()
        logger.warning(
            "ingest.cli_failed",
            extra={"run_id": row.run_id, "collector_key": row.collector_key, "argv": exc.argv},
        )
        return row

    def _persist_raw(self, run_id: str, outcome: RunOutcome) -> str | None:
        """Write the untouched payload to disk, for debugging and evidence.

        Gitignored: raw scrapes are someone else's content and do not belong in the
        repository. A write failure is logged and swallowed — losing a debug artefact
        must not fail an otherwise successful run.
        """
        directory = Path(self._settings.raw_payload_dir)
        try:
            directory.mkdir(parents=True, exist_ok=True)
            path = directory / f"{run_id}.json"
            path.write_text(
                json.dumps(list(outcome.rows), indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
        except OSError:
            logger.warning("ingest.raw_payload_unwritable", extra={"run_id": run_id})
            return None
        return str(path)
