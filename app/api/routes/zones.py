"""Zone reads — what the map draws and the panel explains.

`mode` is deliberately absent. An earlier spec had `GET /api/zones?mode=opportunity`
but never defined what a mode changes, and shipping an undefined parameter is worse
than shipping none. Noted in the README alongside the other dropped field.
"""

import json
from typing import Annotated

from fastapi import APIRouter, Query, Response

from app.api.deps import ZoneServiceDep
from app.schemas.signals import SignalOut
from app.schemas.zones import ZoneListOut, ZoneOut, ZoneSignalsOut

router = APIRouter(prefix="/zones", tags=["zones"])


@router.get("", response_model=ZoneListOut, summary="List convergence zones")
async def list_zones(
    zones: ZoneServiceDep,
    city: Annotated[str | None, Query(max_length=64)] = None,
    domain: Annotated[str | None, Query(max_length=64)] = None,
    min_score: Annotated[float, Query(ge=0.0)] = 0.0,
) -> ZoneListOut:
    """Score every (city, domain) bin in scope, highest first.

    Scores are computed per request from the signals currently stored, because the
    time-decay term means a cached score is a stale one. `min_score` declutters the
    map without changing any zone's score — bins are independent.
    """
    found = await zones.list_zones(city=city, domain=domain, min_score=min_score)
    return ZoneListOut(items=[ZoneOut.model_validate(zone) for zone in found], total=len(found))


@router.get("/export", summary="Export opportunity zones as downloadable JSON")
async def export_zones(
    zones: ZoneServiceDep,
    city: Annotated[str | None, Query(max_length=64)] = None,
    domain: Annotated[str | None, Query(max_length=64)] = None,
    min_score: Annotated[float, Query(ge=0.0)] = 0.0,
) -> Response:
    """Download full filtered opportunity zones dataset as an attachment JSON file."""
    found = await zones.list_zones(city=city, domain=domain, min_score=min_score)
    data = [ZoneOut.model_validate(zone).model_dump(mode="json") for zone in found]
    json_bytes = json.dumps(data, indent=2, default=str).encode("utf-8")
    filename = f"opportunity_zones_export_{city or 'all'}_{domain or 'all'}.json"
    return Response(
        content=json_bytes,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{zone_id}", response_model=ZoneOut, summary="Get one zone")
async def get_zone(zone_id: str, zones: ZoneServiceDep) -> ZoneOut:
    """One zone by its deterministic id, e.g. `delhi-ai-ml`.

    No `min_score` applies: a deep link must open the zone it names even when the
    map is filtered above it.
    """
    return ZoneOut.model_validate(await zones.get_zone(zone_id))


@router.get(
    "/{zone_id}/signals",
    response_model=ZoneSignalsOut,
    summary="Evidence behind a zone",
)
async def get_zone_signals(zone_id: str, zones: ZoneServiceDep) -> ZoneSignalsOut:
    """The deduplicated signals this zone was scored from, in scoring order.

    Each carries its merged `evidence_urls`, which is what lets the panel say
    "3 outlets reported this — counted once" instead of listing it three times.
    """
    zone, signals = await zones.zone_with_signals(zone_id)
    return ZoneSignalsOut(
        zone_id=zone.zone_id,
        city=zone.city,
        domain=zone.domain,
        signals=[SignalOut.model_validate(signal) for signal in signals],
    )
