"""Zone queries: score the stored signals and answer questions about the map.

Zones are **derived, never stored**. There is no `zones` table. A zone is
`build_zones(...)` applied to the signals currently in the database at the current
time, and the time matters: the score decays, so a zone that was 8.4 last week is
6.1 today. Persisting a score would mean persisting a lie with a timestamp on it,
and would require a recompute job nobody has time to write.

The cost is honest and small: every zone request reads the signals in scope and
scores them in Python. With a few thousand rows that is milliseconds, and the
README says so under Known Limitations rather than implying a materialised view.

This service is the single scoring entry point. `GET /api/zones` and the Copilot's
`get_emergence_score` tool both come through here, so the map and the chat can
never disagree about a number.
"""

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.domain.convergence import build_zone, build_zones
from app.domain.dedup import deduplicate
from app.domain.models import NormalizedSignal, Zone
from app.infra.db.repositories import SignalRepository
from app.services.clock import Clock, utcnow
from app.services.errors import ZoneNotFound

logger = logging.getLogger(__name__)


class ZoneService:
    """Builds zones from stored signals on demand."""

    def __init__(
        self,
        *,
        session: AsyncSession,
        settings: Settings,
        clock: Clock = utcnow,
    ) -> None:
        self._session = session
        self._settings = settings
        self._clock = clock
        self._signals = SignalRepository(session)

    async def list_zones(
        self,
        *,
        city: str | None = None,
        domain: str | None = None,
        min_score: float = 0.0,
    ) -> tuple[Zone, ...]:
        """Score every (city, domain) bin in scope, best first.

        `city` and `domain` narrow the SQL, not the scoring: filtering to one city
        cannot change another city's score, because zones are independent bins. That
        property is why the filter can be pushed into the query safely.
        """
        signals = await self._signals.for_scoring(city=city, domain=domain)
        zones = build_zones(signals, self._clock(), min_score=min_score)
        logger.debug(
            "zones.listed",
            extra={"city": city, "domain": domain, "signals": len(signals), "zones": len(zones)},
        )
        return zones

    async def get_zone(self, zone_id: str) -> Zone:
        """One zone by its deterministic id, or `ZoneNotFound`.

        Resolved by scoring all zones and matching the id rather than by parsing
        `delhi-ai-ml` back into a city and a domain. Slugging is lossy — "AI/ML" and
        "AI ML" slug identically — so reversing it would invent a city name that may
        not exist in the data. Building forward is slower and correct.

        No `min_score` filter applies here: a deep link to a quiet zone must open
        it, not 404 because the map happened to be decluttered.
        """
        for zone in await self.list_zones():
            if zone.zone_id == zone_id:
                return zone
        raise ZoneNotFound(f"no zone with id {zone_id!r}")

    async def zone_with_signals(self, zone_id: str) -> tuple[Zone, tuple[NormalizedSignal, ...]]:
        """A zone and the merged evidence behind it.

        The evidence is re-derived with `deduplicate` rather than fetched by
        `zone.signal_ids`, and the difference is not cosmetic: merging happens during
        scoring, so a row read back from the database carries only the URL it was
        published at, while the merged signal carries every outlet that reported the
        same event. Fetching by id would return the survivor stripped of exactly the
        field the evidence panel exists to show.

        `deduplicate` is deterministic, so this reproduces the same survivors, in the
        same order, as the scoring pass that produced `zone.signal_ids`.
        """
        zone = await self.get_zone(zone_id)
        signals = await self._signals.for_scoring(city=zone.city, domain=zone.domain)
        return zone, deduplicate(signals)

    async def score_for(self, city: str, domain: str) -> Zone | None:
        """Score a single named bin, or None when it holds no signals.

        The Copilot's `get_emergence_score` tool calls exactly this. Returning None
        for an empty bin — rather than a zero-scored zone — is deliberate: the
        Copilot must be able to say "there is no data for that" instead of reporting
        a confident 0.0, which reads like a measurement rather than an absence.
        """
        signals = await self._signals.for_scoring(city=city, domain=domain)
        if not signals:
            return None
        return build_zone(city, domain, signals, self._clock())

    async def known_domains(self) -> tuple[str, ...]:
        """Domains present in the data.

        The Copilot's city validation deliberately does *not* have a twin here:
        it reads `SignalService.known_cities`, so this service exposes only what
        scoring itself needs. One caller per method, or the method goes.
        """
        return await self._signals.distinct_domains()
