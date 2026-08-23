"""Ad-Hoc URL scraping service (On-Demand Mode B: "One-Stop Scraper").

Smart-routes arbitrary URLs:
- Fast path: reuses existing provisioned collector if target domain matches registry.
- Slow path: creates a new Scraper Studio collector on-demand, executes a run,
  and normalizes/stores extracted signals into the atlas database.
"""

import hashlib
import logging
from collections.abc import Mapping, Sequence
from typing import Any
from urllib.parse import urlparse

from app.domain.enums import SourceType
from app.domain.models import RawRecord
from app.domain.normalizer import normalize_batch
from app.infra.cli.protocol import ScraperCli
from app.infra.db.repositories import SignalRepository
from app.infra.registry import CollectorRegistry
from app.services.clock import Clock, utcnow

logger = logging.getLogger(__name__)


class AdHocScraperService:
    """Smart router and execution engine for on-demand URL extraction."""

    def __init__(
        self,
        *,
        cli: ScraperCli,
        signal_repo: SignalRepository,
        registry: CollectorRegistry,
        clock: Clock = utcnow,
    ) -> None:
        self._cli = cli
        self._signal_repo = signal_repo
        self._registry = registry
        self._clock = clock

    def _find_matching_collector(self, target_url: str) -> str | None:
        """Find a collector in the registry matching the target domain, if one exists."""
        target_netloc = urlparse(target_url).netloc.lower().removeprefix("www.")
        if not target_netloc:
            return None

        for spec in self._registry.all():
            if not spec.is_provisioned:
                continue
            for url in spec.urls:
                spec_netloc = urlparse(url).netloc.lower().removeprefix("www.")
                if spec_netloc and (
                    spec_netloc == target_netloc
                    or target_netloc.endswith(f".{spec_netloc}")
                    or spec_netloc.endswith(f".{target_netloc}")
                ):
                    return spec.collector_id
        return None

    async def scrape_adhoc_url(
        self,
        target_url: str,
        prompt: str = "",
    ) -> dict[str, Any]:
        """Execute on-demand scraping with domain matching and signal ingestion."""
        existing_collector_id = self._find_matching_collector(target_url)

        if existing_collector_id:
            logger.info(
                "adhoc.fast_path",
                extra={"target_url": target_url, "collector_id": existing_collector_id},
            )
            run_outcome = await self._cli.run(existing_collector_id, target_url)
            return await self._process_extracted_payload(
                run_outcome.rows, existing_collector_id, target_url
            )

        logger.info("adhoc.slow_path", extra={"target_url": target_url})
        url_hash = hashlib.sha256(target_url.encode("utf-8")).hexdigest()[:8]
        collector_name = f"adhoc_{url_hash}"

        cleaned_prompt = (
            (prompt[:490] + "...")
            if len(prompt) > 490
            else (prompt or "Extract news, research announcements, grants, and tech events.")
        )

        create_outcome = await self._cli.create(target_url, cleaned_prompt, name=collector_name)
        new_collector_id = create_outcome.collector_id
        if not new_collector_id or not create_outcome.status.is_success:
            return {
                "success": False,
                "error": create_outcome.error or "Failed to generate ad-hoc collector",
            }

        run_outcome = await self._cli.run(new_collector_id, target_url)
        return await self._process_extracted_payload(run_outcome.rows, new_collector_id, target_url)

    async def _process_extracted_payload(
        self,
        rows: Sequence[Mapping[str, Any]],
        collector_id: str,
        source_url: str,
    ) -> dict[str, Any]:
        """Normalize extracted records, persist to database, and return summary."""
        records = [
            RawRecord(
                fields=dict(row),
                collector_key=f"adhoc_{collector_id}",
                source_url=source_url,
            )
            for row in rows
        ]

        outcome = normalize_batch(
            records=records,
            source_type=SourceType.STARTUP_NEWSROOM,
            now=self._clock(),
        )

        if outcome.signals:
            await self._signal_repo.upsert_many(outcome.signals)

        return {
            "success": True,
            "collector_id": collector_id,
            "records_extracted": len(rows),
            "signals_saved": len(outcome.signals),
            "rejected_records": len(outcome.rejections),
            "signals": [
                {
                    "signal_id": s.signal_id,
                    "title": s.title,
                    "city": s.city,
                    "domain": s.domain,
                    "source_url": s.source_url,
                    "signal_type": s.signal_type.value,
                    "summary": s.summary,
                }
                for s in outcome.signals
            ],
        }
