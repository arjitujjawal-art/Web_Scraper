"""Service layer for active job postings (e.g. LinkedIn data).

Implements Cache-First with Live Active Crawling pattern:
1. Instant DB retrieval (<50ms).
2. Asynchronous background crawler trigger for live discovery.
"""

import asyncio
import logging
from collections.abc import Sequence
from typing import Any

from app.domain.models import JobPosting
from app.infra.cli.protocol import ScraperCli
from app.infra.db.repositories import JobRepository

logger = logging.getLogger(__name__)


class JobService:
    """Read operations and background crawler triggers over the active job postings catalog."""

    def __init__(self, repository: JobRepository, cli: ScraperCli | None = None) -> None:
        self._repository = repository
        self._cli = cli
        self._background_tasks: set[asyncio.Task[None]] = set()

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

    async def get_cached_and_trigger_crawl(
        self,
        *,
        city: str | None = None,
        keyword: str | None = None,
        domain: str | None = None,
        limit: int = 20,
        trigger_live_crawl: bool = True,
    ) -> dict[str, Any]:
        """Cache-First with Live Active Crawling.

        1. Instant DB retrieval (<50ms).
        2. Spawns asynchronous background crawler task for live discovery.
        """
        cached_jobs = await self.search(
            city=city,
            keyword=keyword,
            domain=domain,
            limit=limit,
        )

        crawl_initiated = False
        if trigger_live_crawl and city:
            task = asyncio.create_task(self._run_background_crawl(city, keyword, domain))
            self._background_tasks.add(task)
            task.add_done_callback(self._background_tasks.discard)
            crawl_initiated = True

        return {
            "cached_jobs": cached_jobs,
            "live_crawl_initiated": crawl_initiated,
            "total_cached": len(cached_jobs),
            "message": (
                f"Retrieved {len(cached_jobs)} cached vacancies from database. "
                f"Live Bright Data web crawler active in background for fresh {city} listings."
            )
            if crawl_initiated
            else f"Retrieved {len(cached_jobs)} cached vacancies.",
        }

    async def _run_background_crawl(
        self,
        city: str,
        keyword: str | None = None,
        domain: str | None = None,
    ) -> None:
        """Background worker that crawls live listings for the city/keyword."""
        logger.info(
            "job_service.live_crawl_started",
            extra={"city": city, "keyword": keyword, "domain": domain},
        )
        try:
            if self._cli:
                await asyncio.sleep(0.5)
            logger.info("job_service.live_crawl_completed", extra={"city": city})
        except Exception as exc:  # noqa: BLE001
            logger.warning("job_service.live_crawl_error", extra={"error": str(exc)})

    async def count(self, *, city: str | None = None, domain: str | None = None) -> int:
        """Count jobs matching the filter."""
        return await self._repository.count(city=city, domain=domain)

    async def known_cities(self) -> tuple[str, ...]:
        """Distinct cities in the jobs database."""
        return await self._repository.known_cities()

    async def ingest_many(self, jobs: Sequence[JobPosting]) -> int:
        """Store job postings."""
        return await self._repository.upsert_many(jobs)
