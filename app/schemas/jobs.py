"""Job posting DTOs for the active job vacancies map layer."""

from pydantic import Field

from app.domain.geo import CITY_CENTRES, resolve_location
from app.domain.models import JobPosting
from app.schemas.common import ApiModel


class JobPostingOut(ApiModel):
    """An active job vacancy marker and details."""

    id: str
    title: str
    company: str
    city: str
    domain: str
    job_type: str = "Full-time"
    salary_range: str = "Not specified"
    summary: str = ""
    skills: list[str] = Field(default_factory=list)
    source_url: str = ""
    source: str = "LinkedIn Jobs"
    lat: float
    lng: float

    @classmethod
    def from_domain(cls, job: JobPosting) -> "JobPostingOut":
        """Construct from a domain JobPosting, resolving lat/lng for map display."""
        resolved = resolve_location(job.city)
        if resolved:
            lat = resolved.coordinates.latitude
            lng = resolved.coordinates.longitude
        else:
            centre = next(iter(CITY_CENTRES.values()))
            lat = centre.latitude
            lng = centre.longitude

        return cls(
            id=job.job_id,
            title=job.title,
            company=job.company,
            city=job.city,
            domain=job.domain,
            job_type=job.job_type,
            salary_range=job.salary_range,
            summary=job.summary,
            skills=list(job.skills),
            source_url=job.source_url,
            source=job.source,
            lat=lat,
            lng=lng,
        )


class JobListOut(ApiModel):
    """Collection of active job postings."""

    items: list[JobPostingOut]
    total: int
