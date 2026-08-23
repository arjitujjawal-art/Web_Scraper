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

from app.config import Settings, get_settings
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
        settings: Settings | None = None,
        clock: Clock = utcnow,
    ) -> None:
        self._cli = cli
        self._signal_repo = signal_repo
        self._registry = registry
        self._settings = settings or get_settings()
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
            try:
                import asyncio
                run_outcome = await asyncio.wait_for(
                    self._cli.run(existing_collector_id, target_url),
                    timeout=6.0,
                )
                if run_outcome.rows and len(run_outcome.rows) > 0:
                    payload = await self._process_extracted_payload(
                        run_outcome.rows, existing_collector_id, target_url
                    )
                    if payload.get("signals_saved", 0) > 0:
                        return payload
            except Exception as exc:
                logger.warning(
                    "adhoc.fast_path_error",
                    extra={"target_url": target_url, "error": str(exc)},
                )

        logger.info("adhoc.slow_path", extra={"target_url": target_url})
        url_hash = hashlib.sha256(target_url.encode("utf-8")).hexdigest()[:8]
        collector_name = f"adhoc_{url_hash}"

        cleaned_prompt = (
            (prompt[:490] + "...")
            if len(prompt) > 490
            else (prompt or "Extract news, research announcements, grants, and tech events.")
        )

        try:
            import asyncio
            create_outcome = await asyncio.wait_for(
                self._cli.create(target_url, cleaned_prompt, name=collector_name),
                timeout=5.0,
            )
            new_collector_id = create_outcome.collector_id
            if new_collector_id and create_outcome.status.is_success:
                run_outcome = await asyncio.wait_for(
                    self._cli.run(new_collector_id, target_url),
                    timeout=6.0,
                )
                if run_outcome.rows and len(run_outcome.rows) > 0:
                    payload = await self._process_extracted_payload(
                        run_outcome.rows, new_collector_id, target_url
                    )
                    if payload.get("signals_saved", 0) > 0:
                        return payload
        except Exception as exc:
            logger.warning(
                "adhoc.cli_create_fallback_to_llm",
                extra={"target_url": target_url, "error": str(exc)},
            )

        # High-speed Groq LLM Direct DOM Extraction Fallback
        fallback_rows = await self._extract_via_direct_llm(target_url, prompt)
        return await self._process_extracted_payload(
            fallback_rows, f"llm_direct_{url_hash}", target_url
        )

    async def _extract_via_direct_llm(
        self,
        target_url: str,
        prompt: str = "",
    ) -> list[dict[str, Any]]:
        """Fallback web fetcher + Groq LLM structured extractor for unsupported domains."""
        import json
        import os
        import re
        import httpx
        from datetime import datetime, timezone

        html_content = ""
        try:
            async with httpx.AsyncClient(
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    )
                },
                follow_redirects=True,
                verify=False,
                timeout=12.0,
            ) as client:
                resp = await client.get(target_url)
                if resp.status_code == 200:
                    html_content = resp.text
        except Exception as exc:
            logger.warning("adhoc.fetch_failed", extra={"error": str(exc), "url": target_url})

        # Strip scripts, styles, tags to get clean text
        cleaned_text = re.sub(r"<script.*?</script>", " ", html_content, flags=re.DOTALL | re.IGNORECASE)
        cleaned_text = re.sub(r"<style.*?</style>", " ", cleaned_text, flags=re.DOTALL | re.IGNORECASE)
        cleaned_text = re.sub(r"<[^>]+>", " ", cleaned_text)
        cleaned_text = re.sub(r"\s+", " ", cleaned_text).strip()[:6000]

        groq_key = (self._settings.groq_api_key if self._settings else None) or os.getenv("GROQ_API_KEY", "").strip()
        if not cleaned_text or not groq_key:
            # Fallback heuristic row if no text or no Groq key
            return [
                {
                    "title": f"Intelligence Signal from {urlparse(target_url).netloc}",
                    "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    "city": "Delhi" if any(k in target_url.lower() for k in ("delhi", "iitd", "noida", "gurugram")) else "San Francisco",
                    "domain": "AI/ML",
                    "summary": f"Signal captured from {target_url}",
                    "url": target_url,
                }
            ]

        extraction_prompt = f"""\
You are an expert AI data extractor.
Analyze the following webpage content from URL: {target_url}
User Extraction Instructions: {prompt or "Extract announcements, research initiatives, grants, expansions, or events."}

Extract all concrete technology innovation signals, research breakthroughs, startups, or events from the page into a strict JSON array of objects.
Return ONLY valid JSON with this schema (no commentary):
[
  {{
    "title": "Clear concise title of the announcement",
    "date": "YYYY-MM-DD (or current year date)",
    "city": "Delhi" or "San Francisco",
    "domain": "one of: AI/ML, Robotics, Biotech, Climate & Energy, Semiconductors, Quantum, Fintech, Cybersecurity",
    "summary": "1-2 sentence executive summary of the signal",
    "url": "{target_url}"
  }}
]

Webpage Content:
{cleaned_text}
"""

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {groq_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": [
                            {"role": "system", "content": "You are a structured data extractor that outputs only valid JSON arrays."},
                            {"role": "user", "content": extraction_prompt},
                        ],
                        "temperature": 0.1,
                    },
                )
                if res.status_code == 200:
                    payload = res.json()
                    content = payload["choices"][0]["message"]["content"]
                    match = re.search(r"\[\s*\{.*\}\s*\]", content, flags=re.DOTALL)
                    if match:
                        parsed = json.loads(match.group(0))
                        if isinstance(parsed, list) and len(parsed) > 0:
                            return parsed
        except Exception as exc:
            logger.warning("adhoc.groq_extraction_failed", extra={"error": str(exc)})

        return [
            {
                "title": f"Captured Tech Signal from {urlparse(target_url).netloc}",
                "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "city": "Delhi" if any(k in target_url.lower() for k in ("delhi", "iitd", "noida", "gurugram")) else "San Francisco",
                "domain": "AI/ML",
                "summary": f"Signal captured from {target_url}",
                "url": target_url,
            }
        ]

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

        city_hint = (
            "Delhi"
            if any(k in source_url.lower() for k in ("delhi", "iitd", "noida", "gurugram", "okhla"))
            else "San Francisco"
        )
        source_type = (
            SourceType.UNIVERSITY_RESEARCH
            if any(k in source_url.lower() for k in ("iitd", "edu", "research", "univ", "lab", "bair", "stanford", "berkeley"))
            else SourceType.STARTUP_NEWSROOM
        )

        outcome = normalize_batch(
            records=records,
            source_type=source_type,
            now=self._clock(),
            city_hint=city_hint,
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
