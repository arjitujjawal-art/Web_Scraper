"""Run history and the polling endpoint every admin `POST` points at.

`GET /api/collector-runs/{run_id}` is the other half of the async model: a client
holds a `run_id` from a 202 and polls here until `status` is `SUCCEEDED` or
`FAILED`. It is also where the proposed repair appears — `diff_summary`,
`next_step` and `preview_rows` are populated by a heal that came back
`awaiting_approval`.
"""

from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import CollectorServiceDep
from app.domain.enums import CollectorAction, RunStatus
from app.schemas.collectors import CollectorRunListOut, CollectorRunOut

router = APIRouter(prefix="/collector-runs", tags=["collector-runs"])


@router.get("", response_model=CollectorRunListOut, summary="List runs")
async def list_runs(
    collectors: CollectorServiceDep,
    collector_key: Annotated[str | None, Query(max_length=64)] = None,
    action: CollectorAction | None = None,
    status: RunStatus | None = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 25,
) -> CollectorRunListOut:
    """Newest-first run history, optionally narrowed to one collector or action."""
    rows = await collectors.list_runs(
        collector_key=collector_key, action=action, status=status, limit=limit
    )
    return CollectorRunListOut(
        items=[CollectorRunOut.model_validate(row) for row in rows], total=len(rows)
    )


@router.get("/{run_id}", response_model=CollectorRunOut, summary="Poll one run")
async def get_run(run_id: str, collectors: CollectorServiceDep) -> CollectorRunOut:
    """The full state of one job.

    Poll until `status` is terminal. A run that dies for any reason — CLI failure,
    timeout, process shutdown — is recorded as `FAILED` with a reason rather than
    left in `RUNNING`, so a poller always terminates.
    """
    return CollectorRunOut.model_validate(await collectors.get_run(run_id))
