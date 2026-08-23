"""Collector dashboard data: registry configuration joined to observed health.

The Bright Data CLI has no `scraper list` and no `scraper status` command, so
"how are my collectors doing?" cannot be answered by asking Bright Data. It is
answered from `collector_runs` — our own history — joined to
`collectors/registry.yaml`. That is a consequence of the tool, documented here
rather than discovered later.

`CollectorStatus` is a plain frozen dataclass, not an ORM row. Routes serialise it
through `app/schemas/` with `from_attributes=True`, which is how the schema layer
stays free of any import from `app.infra`.
"""

import logging
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import CollectorAction, CollectorHealth, RunStatus, SourceType
from app.infra.db.models import CollectorRunRow
from app.infra.db.repositories import CollectorRunRepository
from app.infra.registry import CollectorRegistry, CollectorSpec
from app.services.errors import RunNotFound

logger = logging.getLogger(__name__)

_AWAITING_APPROVAL = "awaiting_approval"


@dataclass(frozen=True, slots=True)
class CollectorStatus:
    """One collector as the dashboard needs to render it.

    Configuration (key, urls, provisioned) comes from the registry; everything
    after `health` comes from the most recent run row, or is None when the
    collector has never been run.
    """

    key: str
    source_type: SourceType
    collector_id: str
    urls: tuple[str, ...]
    city_hint: str | None
    description: str | None
    required_fields: tuple[str, ...]
    enabled: bool
    is_provisioned: bool
    health: CollectorHealth
    awaiting_approval: bool
    last_run_id: str | None = None
    last_action: CollectorAction | None = None
    last_status: RunStatus | None = None
    last_run_at: datetime | None = None
    last_fill_rate: float | None = None
    last_records_found: int | None = None
    last_error: str | None = None
    notes: str | None = None

    @property
    def needs_attention(self) -> bool:
        """Whether a human should look at this collector.

        Drives the red badge on the dashboard. `HEALING_REVIEW` is included: a
        repair waiting for approval is blocked on a person, which is exactly the
        state the demo is built around.
        """
        return self.health in {
            CollectorHealth.DEGRADED,
            CollectorHealth.FAILED,
            CollectorHealth.HEALING_REVIEW,
        }


class CollectorService:
    """Reads collector configuration and run history. Never invokes the CLI."""

    def __init__(self, *, session: AsyncSession, registry: CollectorRegistry) -> None:
        self._session = session
        self._registry = registry
        self._runs = CollectorRunRepository(session)

    async def list_statuses(self) -> tuple[CollectorStatus, ...]:
        """Every registered collector, in registry order.

        Registry order, not "most recently run": the list is configuration, and a
        collector that has never run must still appear — an unprovisioned or
        never-run collector is information, not an absence.
        """
        latest = await self._runs.latest_per_collector()
        pending = await self._pending_approvals()
        return tuple(
            self._status(spec, latest.get(spec.key), spec.key in pending)
            for spec in self._registry.all()
        )

    async def get_status(self, collector_key: str) -> CollectorStatus:
        """One collector's status. Raises `RegistryError` for an unknown key."""
        spec = self._registry.get(collector_key)
        latest = await self._runs.latest_for(collector_key)
        pending = await self._runs.latest_awaiting_approval(collector_key)
        return self._status(spec, latest, pending is not None)

    async def list_runs(
        self,
        *,
        collector_key: str | None = None,
        action: CollectorAction | None = None,
        status: RunStatus | None = None,
        limit: int = 25,
    ) -> tuple[CollectorRunRow, ...]:
        """Run history, newest first, for the runs table and for polling clients."""
        if collector_key is not None:
            self._registry.get(collector_key)  # 404 on an unknown key, not an empty list
        return await self._runs.list_runs(
            collector_key=collector_key,
            action=action,
            status=status,
            limit=max(1, min(limit, 200)),
        )

    async def get_run(self, run_id: str) -> CollectorRunRow:
        """One run row, or `RunNotFound`.

        This is the endpoint every admin `POST` tells its client to poll, so the
        404 has to be a real, typed error rather than a null body.
        """
        row = await self._runs.get(run_id)
        if row is None:
            raise RunNotFound(f"run {run_id!r} does not exist")
        return row

    async def pending_approval(self, collector_key: str) -> CollectorRunRow | None:
        """The repair waiting on a human for this collector, if any."""
        return await self._runs.latest_awaiting_approval(collector_key)

    # -- internals ---------------------------------------------------------

    async def _pending_approvals(self) -> set[str]:
        """Collector keys with a heal awaiting approval.

        Derived from the same bounded window `latest_per_collector` reads, so the
        dashboard costs two queries regardless of how many collectors exist.
        """
        heals = await self._runs.list_runs(action=CollectorAction.HEAL, limit=200)
        applied: set[str] = set()
        pending: set[str] = set()
        for row in heals:  # newest first
            if row.collector_key in applied or row.collector_key in pending:
                continue
            if row.cli_status == _AWAITING_APPROVAL:
                pending.add(row.collector_key)
            elif row.cli_status:
                applied.add(row.collector_key)
        return pending

    @staticmethod
    def _status(
        spec: CollectorSpec,
        latest: CollectorRunRow | None,
        awaiting_approval: bool,
    ) -> CollectorStatus:
        health = latest.health if latest else CollectorHealth.UNKNOWN
        return CollectorStatus(
            key=spec.key,
            source_type=spec.source_type,
            collector_id=spec.collector_id,
            urls=spec.urls,
            city_hint=spec.city_hint,
            description=spec.description,
            required_fields=spec.required_fields,
            enabled=spec.enabled,
            is_provisioned=spec.is_provisioned,
            health=health,
            awaiting_approval=awaiting_approval,
            last_run_id=latest.run_id if latest else None,
            last_action=latest.action if latest else None,
            last_status=latest.status if latest else None,
            last_run_at=latest.started_at if latest else None,
            last_fill_rate=latest.fill_rate if latest else None,
            last_records_found=latest.records_found if latest else None,
            last_error=latest.error if latest else None,
            notes=latest.notes if latest else None,
        )
