"""Active job vacancies query route for map layer and talent search."""

from typing import Annotated

from fastapi import APIRouter, Query

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
