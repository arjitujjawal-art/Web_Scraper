"""Collector status — the health dashboard's read side.

Served from our own `collector_runs` table, not from Bright Data. The CLI has no
`scraper list` and no `scraper status` command, so run history has to be ours; that
constraint is the reason this table exists at all.
"""

from fastapi import APIRouter

from app.api.deps import CollectorServiceDep
from app.schemas.collectors import CollectorListOut, CollectorOut

router = APIRouter(prefix="/collectors", tags=["collectors"])


@router.get("", response_model=CollectorListOut, summary="List collectors and health")
async def list_collectors(collectors: CollectorServiceDep) -> CollectorListOut:
    """Every registered collector in registry order, with its latest health.

    Unprovisioned and disabled collectors are included on purpose: a collector that
    has never run is information, and hiding it would make the dashboard look
    complete while the demo was one `PENDING` id away from failing.
    """
    statuses = await collectors.list_statuses()
    return CollectorListOut(
        items=[CollectorOut.model_validate(status) for status in statuses],
        total=len(statuses),
        needs_attention=sum(1 for status in statuses if status.needs_attention),
    )


@router.get("/{collector_key}", response_model=CollectorOut, summary="Get one collector")
async def get_collector(collector_key: str, collectors: CollectorServiceDep) -> CollectorOut:
    """One collector's configuration and latest run.

    An unknown key raises `RegistryError`, which the error handler turns into a 404
    whose message lists the registered keys.
    """
    return CollectorOut.model_validate(await collectors.get_status(collector_key))
