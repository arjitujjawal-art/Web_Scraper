"""Active job vacancies query route for map layer and talent search."""

import json
from typing import Annotated

from fastapi import APIRouter, Query, Response

from app.api.deps import JobServiceDep
from app.schemas.jobs import JobListOut, JobPostingOut

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=JobListOut, summary="List active job postings")
async def list_jobs(
    jobs: JobServiceDep,
    city: Annotated[str | None, Query(max_length=64, description="Filter by city")] = None,
    domain: Annotated[str | None, Query(max_length=64, description="Filter by tech domain")] = None,
    keyword: Annotated[str | None, Query(max_length=128, description="Role title or skill")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> JobListOut:
    """Returns traditional active job vacancies to render as a secondary map layer."""
    items = await jobs.search(
        city=city,
        domain=domain,
        keyword=keyword,
        limit=limit,
        offset=offset,
    )
    total = await jobs.count(city=city, domain=domain)
    return JobListOut(
        items=[JobPostingOut.from_domain(job) for job in items],
        total=total,
    )


@router.get("/export", summary="Export active jobs as downloadable JSON")
async def export_jobs(
    jobs: JobServiceDep,
    city: Annotated[str | None, Query(max_length=64)] = None,
    domain: Annotated[str | None, Query(max_length=64)] = None,
    keyword: Annotated[str | None, Query(max_length=128)] = None,
) -> Response:
    """Download full filtered jobs dataset as an attachment JSON file."""
    items = await jobs.search(
        city=city,
        domain=domain,
        keyword=keyword,
        limit=500,
        offset=0,
    )
    data = [JobPostingOut.from_domain(job).model_dump(mode="json") for job in items]
    json_bytes = json.dumps(data, indent=2, default=str).encode("utf-8")
    filename = f"jobs_export_{city or 'all'}_{domain or 'all'}.json"
    return Response(
        content=json_bytes,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
