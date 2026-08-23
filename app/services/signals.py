"""Signal reads: one filtered query, two surfaces.

Thin by design. It exists so that `GET /api/signals` and the Copilot's
`search_signals` tool call the *same* method with the same defaults and the same
cap on `limit`. A route that reached for `SignalRepository` directly would work
today and drift tomorrow — the Copilot would quietly gain an unbounded query, or
the API would quietly gain a filter the Copilot cannot use.
"""

import logging
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import SourceType
from app.domain.models import NormalizedSignal
from app.infra.db.repositories import SignalRepository
from app.services.clock import Clock, utcnow

logger = logging.getLogger(__name__)

# A hard ceiling, not a default. The Copilot passes a user-supplied number
# straight through, and "give me all 90000 signals" must not become one response.
MAX_PAGE_SIZE = 200
DEFAULT_PAGE_SIZE = 50


@dataclass(frozen=True, slots=True)
class SignalPage:
    """One page of signals plus the totals a client needs to paginate.

    `total` is the count *before* paging, so the frontend can render "showing 50 of
    214" without a second request.
    """

    items: tuple[NormalizedSignal, ...]
    total: int
    limit: int
    offset: int

    @property
    def has_more(self) -> bool:
        """Whether another page exists after this one."""
        return self.offset + len(self.items) < self.total


class SignalService:
    """Filtered, bounded reads over stored signals."""

    def __init__(
        self,
        *,
        session: AsyncSession,
        clock: Clock = utcnow,
    ) -> None:
        self._session = session
        self._clock = clock
        self._signals = SignalRepository(session)

    async def search(
        self,
        *,
        city: str | None = None,
        domain: str | None = None,
        source_type: SourceType | None = None,
        since: datetime | None = None,
        limit: int = DEFAULT_PAGE_SIZE,
        offset: int = 0,
    ) -> SignalPage:
        """Newest-first page of matching signals, with the total.

        `limit` is clamped rather than rejected: a caller asking for 5000 gets 200
        and a usable answer, which is the right behaviour for a chat tool that
        cannot re-prompt itself.
        """
        bounded = max(1, min(limit, MAX_PAGE_SIZE))
        start = max(0, offset)

        items = await self._signals.search(
            city=city,
            domain=domain,
            source_type=source_type,
            since=since,
            limit=bounded,
            offset=start,
        )
        total = await self._signals.count(
            city=city, domain=domain, source_type=source_type, since=since
        )
        return SignalPage(items=items, total=total, limit=bounded, offset=start)

    async def get(self, signal_id: str) -> NormalizedSignal | None:
        """One signal by id, for an evidence link out of the map or the chat panel."""
        return await self._signals.get(signal_id)

    async def known_cities(self) -> tuple[str, ...]:
        """Cities present in the data, used to ground the Copilot's answers."""
        return await self._signals.distinct_cities()

    async def known_domains(self) -> tuple[str, ...]:
        """Technology domains present in the data."""
        return await self._signals.distinct_domains()

    async def freshness(self) -> datetime | None:
        """When the most recent signal was extracted, for `GET /api/health`."""
        return await self._signals.latest_extracted_at()

    async def total(self) -> int:
        """How many signals are stored, unfiltered."""
        return await self._signals.count()
