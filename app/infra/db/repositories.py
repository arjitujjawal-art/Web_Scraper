"""The only module in the application that contains SQL.

This is a hard rule, not a style preference. The Signal Copilot's tools, the REST
routes and the seeder all reach the database through these methods, which is what
guarantees the chat surface and the API cannot drift apart: if the Copilot needs a
query that does not exist, the method is added here and both surfaces gain it.

Signals are returned as domain objects. Run rows are returned as ORM rows because
callers update their status in place; nothing above `services/` touches them
directly — routes serialise them through `app/schemas/` with `from_attributes`.
"""

from collections.abc import Sequence
from datetime import datetime
from typing import Any, TypeVar

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import CollectorAction, RunStatus, SourceType
from app.domain.models import NormalizedSignal
from app.infra.db.models import CollectorRunRow, SignalRow

# `_filtered` is used with both `select(SignalRow)` and `select(func.count())`, which
# have different row types. Parameterising on the statement keeps each caller's own
# type intact instead of widening every query to `Select[tuple[object, ...]]`.
_StatementT = TypeVar("_StatementT", bound=Select[Any])


class SignalRepository:
    """Reads and writes on the `signals` table."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def upsert_many(self, signals: Sequence[NormalizedSignal]) -> int:
        """Insert or update signals by their deterministic id.

        `merge` rather than `add`: a collector re-run produces the same
        `signal_id` for the same article, and the second run must update the row
        rather than raise on the primary key. This is what makes re-running after a
        heal idempotent.

        Returns the number of signals written.
        """
        for signal in signals:
            await self._session.merge(SignalRow.from_domain(signal))
        await self._session.flush()
        return len(signals)

    async def get(self, signal_id: str) -> NormalizedSignal | None:
        """One signal by its deterministic id, or None when it was never ingested."""
        row = await self._session.get(SignalRow, signal_id)
        return row.to_domain() if row else None

    async def search(
        self,
        *,
        city: str | None = None,
        domain: str | None = None,
        source_type: SourceType | None = None,
        since: datetime | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[NormalizedSignal, ...]:
        """Filtered, newest-first page of signals.

        Backs both `GET /api/signals` and the Copilot's `search_signals` tool. One
        query, one set of semantics, two surfaces.
        """
        statement = self._filtered(
            select(SignalRow), city=city, domain=domain, source_type=source_type, since=since
        )
        statement = (
            statement.order_by(SignalRow.date.desc(), SignalRow.signal_id)
            .limit(limit)
            .offset(offset)
        )
        result = await self._session.execute(statement)
        return tuple(row.to_domain() for row in result.scalars())

    async def count(
        self,
        *,
        city: str | None = None,
        domain: str | None = None,
        source_type: SourceType | None = None,
        since: datetime | None = None,
    ) -> int:
        """Total matching rows, so a paged response can report `total`."""
        statement = self._filtered(
            select(func.count()).select_from(SignalRow),
            city=city,
            domain=domain,
            source_type=source_type,
            since=since,
        )
        return int((await self._session.execute(statement)).scalar_one())

    async def for_scoring(
        self, *, city: str | None = None, domain: str | None = None
    ) -> tuple[NormalizedSignal, ...]:
        """Every signal in scope, unpaged, ordered deterministically.

        Scoring needs the whole bin — a page would silently truncate a zone's
        score. Deliberately separate from `search` so a `limit` can never leak into
        the maths.
        """
        statement = self._filtered(select(SignalRow), city=city, domain=domain)
        statement = statement.order_by(SignalRow.date, SignalRow.signal_id)
        result = await self._session.execute(statement)
        return tuple(row.to_domain() for row in result.scalars())

    async def distinct_cities(self) -> tuple[str, ...]:
        """Cities actually present in the data.

        The Copilot validates a user's city against this before answering, so an
        unknown city returns "no signals for that city" instead of a substituted one.
        """
        result = await self._session.execute(
            select(SignalRow.city).distinct().order_by(SignalRow.city)
        )
        return tuple(result.scalars())

    async def distinct_domains(self) -> tuple[str, ...]:
        """Domains actually present in the data, for the same grounding reason."""
        result = await self._session.execute(
            select(SignalRow.domain).distinct().order_by(SignalRow.domain)
        )
        return tuple(result.scalars())

    async def latest_extracted_at(self) -> datetime | None:
        """Freshness stamp for `GET /api/health`."""
        result = await self._session.execute(select(func.max(SignalRow.extracted_at)))
        return result.scalar_one_or_none()

    @staticmethod
    def _filtered(
        statement: _StatementT,
        *,
        city: str | None = None,
        domain: str | None = None,
        source_type: SourceType | None = None,
        since: datetime | None = None,
    ) -> _StatementT:
        """Apply shared filters.

        Values are bound parameters, never interpolated — the same principle as the
        argv list in `infra/cli/bdata.py`, applied to the other place user input
        meets an interpreter.
        """
        if city:
            statement = statement.where(SignalRow.city == city)
        if domain:
            statement = statement.where(SignalRow.domain == domain)
        if source_type:
            statement = statement.where(SignalRow.source_type == source_type)
        if since:
            statement = statement.where(SignalRow.date >= since)
        return statement


class CollectorRunRepository:
    """Reads and writes on the `collector_runs` table.

    This table is the collector dashboard: the Bright Data CLI has no `list` or
    `status` command, so run history has to be ours.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, row: CollectorRunRow) -> CollectorRunRow:
        """Persist a new run row and flush, so its id is usable immediately."""
        self._session.add(row)
        await self._session.flush()
        return row

    async def get(self, run_id: str) -> CollectorRunRow | None:
        """One run by id, backing the poll endpoint."""
        return await self._session.get(CollectorRunRow, run_id)

    async def list_runs(
        self,
        *,
        collector_key: str | None = None,
        action: CollectorAction | None = None,
        status: RunStatus | None = None,
        limit: int = 25,
    ) -> tuple[CollectorRunRow, ...]:
        """Newest-first run history, optionally narrowed by collector, action or status."""
        statement = select(CollectorRunRow)
        if collector_key:
            statement = statement.where(CollectorRunRow.collector_key == collector_key)
        if action:
            statement = statement.where(CollectorRunRow.action == action)
        if status:
            statement = statement.where(CollectorRunRow.status == status)
        statement = statement.order_by(CollectorRunRow.started_at.desc()).limit(limit)
        result = await self._session.execute(statement)
        return tuple(result.scalars())

    async def latest_for(self, collector_key: str) -> CollectorRunRow | None:
        """The most recent operation on one collector, whatever its action."""
        rows = await self.list_runs(collector_key=collector_key, limit=1)
        return rows[0] if rows else None

    async def latest_per_collector(self) -> dict[str, CollectorRunRow]:
        """Most recent operation per collector, for `GET /api/collectors`.

        Fetches a bounded window and folds it in Python rather than issuing a
        correlated subquery per collector: with a handful of collectors this is one
        query and no window-function portability concerns.
        """
        result = await self._session.execute(
            select(CollectorRunRow).order_by(CollectorRunRow.started_at.desc()).limit(500)
        )
        latest: dict[str, CollectorRunRow] = {}
        for row in result.scalars():
            latest.setdefault(row.collector_key, row)
        return latest

    async def latest_awaiting_approval(self, collector_key: str) -> CollectorRunRow | None:
        """The pending repair for a collector, if one is waiting for a human.

        `POST /approve` uses this to refuse cleanly when nothing is actually gated,
        instead of spending 600 s discovering it from the CLI.
        """
        rows = await self.list_runs(
            collector_key=collector_key, action=CollectorAction.HEAL, limit=5
        )
        return next((row for row in rows if row.cli_status == "awaiting_approval"), None)
