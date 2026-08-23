"""Service layer for active job postings (e.g. LinkedIn data).

Pure business logic wrapping `JobRepository`.
"""

from collections.abc import Sequence

from app.domain.models import JobPosting
from app.infra.db.repositories import JobRepository


class JobService:
    """Read operations over the active job postings catalog."""

    def __init__(self, repository: JobRepository) -> None:
        self._repository = repository

    async def search(
        self,
        *,
        city: str | None = None,
        keyword: str | None = None,
        domain: str | None = None,
        limit: int = 10,
        offset: int = 0,
    ) -> tuple[JobPosting, ...]:
        """Search active job vacancies filtered by city, keyword, or domain."""
        return await self._repository.search(
            city=city,
            keyword=keyword,
            domain=domain,
            limit=limit,
            offset=offset,
        )

    async def count(self, *, city: str | None = None, domain: str | None = None) -> int:
        """Count jobs matching the filter."""
        return await self._repository.count(city=city, domain=domain)

    async def known_cities(self) -> tuple[str, ...]:
        """Distinct cities in the jobs database."""
        return await self._repository.known_cities()

    async def ingest_many(self, jobs: Sequence[JobPosting]) -> int:
        """Store job postings."""
        return await self._repository.upsert_many(jobs)
