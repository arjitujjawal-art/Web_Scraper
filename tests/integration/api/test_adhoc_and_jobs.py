"""Integration tests for Ad-Hoc on-demand scraping and Active Jobs map layer."""

import json
from dataclasses import dataclass
from typing import Any

import pytest
from app.domain.models import JobPosting
from app.infra.cli.fake import FakeCli
from httpx import AsyncClient

from tests.helpers import store_jobs


@dataclass
class Text:
    text: str
    type: str = "text"


@dataclass
class ToolUse:
    id: str
    name: str
    input: dict[str, Any]
    type: str = "tool_use"


@dataclass
class Reply:
    content: list[Any]


def _scenario_jobs() -> tuple[JobPosting, ...]:
    return (
        JobPosting(
            job_id="job_delhi_ai_01",
            title="Senior ML Engineer",
            company="CyberTech Labs",
            city="Gurugram",
            domain="AI/ML",
            salary_range="₹24,00,000 - ₹32,00,000 PA",
            summary="Transformer models and pipelines",
            skills=("Python", "PyTorch", "LLMs"),
            source_url="https://linkedin.com/jobs/view/101",
        ),
        JobPosting(
            job_id="job_delhi_robotics_01",
            title="Robotics Engineer",
            company="IndoBotics Dynamics",
            city="Delhi",
            domain="Robotics",
            salary_range="₹16,00,000 - ₹22,00,000 PA",
            summary="ROS2 navigation stack",
            skills=("C++", "ROS2", "SLAM"),
            source_url="https://linkedin.com/jobs/view/102",
        ),
        JobPosting(
            job_id="job_sf_ai_01",
            title="Principal AI Scientist",
            company="Neural Bay Systems",
            city="San Francisco",
            domain="AI/ML",
            salary_range="$220,000 - $280,000",
            summary="Foundation model pretraining",
            skills=("Python", "CUDA", "Distributed Systems"),
            source_url="https://linkedin.com/jobs/view/103",
        ),
    )


class TestJobsLayerEndpoint:
    @pytest.mark.asyncio
    async def test_list_jobs_returns_all(self, client: AsyncClient, app_instance: Any) -> None:
        await store_jobs(app_instance, *_scenario_jobs())

        res = await client.get("/api/jobs")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 3
        assert len(data["items"]) == 3
        first = data["items"][0]
        assert "lat" in first and "lng" in first
        assert first["lat"] != 0.0

    @pytest.mark.asyncio
    async def test_list_jobs_filtered_by_city_and_domain(
        self, client: AsyncClient, app_instance: Any
    ) -> None:
        await store_jobs(app_instance, *_scenario_jobs())

        res = await client.get("/api/jobs?city=Gurugram&domain=AI/ML")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 1
        assert data["items"][0]["title"] == "Senior ML Engineer"


class TestAdHocScrapingEndpoint:
    @pytest.mark.asyncio
    async def test_adhoc_fast_path_domain_matched(
        self, client: AsyncClient, fake_cli: FakeCli
    ) -> None:
        # In test_registry.yaml, baseline url is https://example.test/signal-atlas/fixtures/newsroom_v1.html
        # Target URL matches example.test -> triggers fast path
        scraped_row = [
            {
                "title": "IIT Delhi opens new Autonomous AI Center in Hauz Khas",
                "date": "2026-08-10",
                "city": "Hauz Khas",
                "domain": "AI/ML",
                "summary": "State of the art lab facility",
                "source_url": "https://example.test/news/ai-lab-hauz-khas",
            }
        ]
        fake_cli.enqueue_run(json.dumps(scraped_row))

        res = await client.post(
            "/api/collectors/ad-hoc",
            json={
                "url": "https://example.test/news/ai-lab-hauz-khas",
                "prompt": "Extract AI lab launch",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["records_extracted"] == 1
        assert data["signals_saved"] == 1
        assert "Autonomous AI Center" in data["signals"][0]["title"]

    @pytest.mark.asyncio
    async def test_adhoc_slow_path_new_domain(self, client: AsyncClient, fake_cli: FakeCli) -> None:
        # Target URL does not match any collector in test_registry.yaml -> triggers slow path
        scraped_row = [
            {
                "title": "Quantum Computing Lab opens at Berkeley with new processor",
                "date": "2026-08-12",
                "city": "Berkeley",
                "domain": "Quantum",
                "summary": "Superconducting qubit processor facility",
                "source_url": "https://new-quantum-domain.org/breakthrough",
            }
        ]
        fake_cli.enqueue_create(json.dumps({"status": "done", "collector_id": "c_quantum12345"}))
        fake_cli.enqueue_run(json.dumps(scraped_row))

        res = await client.post(
            "/api/collectors/ad-hoc",
            json={
                "url": "https://new-quantum-domain.org/breakthrough",
                "prompt": "Extract quantum photonics lab announcement",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["collector_id"] == "c_quantum12345"
        assert data["signals_saved"] == 1
        assert data["signals"][0]["domain"] == "Quantum"


class TestCopilotCustomScrapingTool:
    @pytest.mark.asyncio
    async def test_copilot_executes_scrape_custom_url(
        self, client: AsyncClient, app_instance: Any, fake_cli: FakeCli
    ) -> None:
        scraped_row = [
            {
                "title": "Delhi Tech Hub announces Semiconductor Fab Lab in Okhla",
                "date": "2026-08-14",
                "city": "Okhla",
                "domain": "Semiconductors",
                "summary": "Fab prototyping facility",
                "source_url": "https://example.test/semi-fab-okhla",
            }
        ]
        fake_cli.enqueue_run(json.dumps(scraped_row))

        turns = iter(
            [
                Reply(
                    [
                        ToolUse(
                            id="t_scrape",
                            name="scrape_custom_url",
                            input={
                                "url": "https://example.test/semi-fab-okhla",
                                "intent": "Extract semiconductor fab announcement",
                            },
                        )
                    ]
                ),
                Reply(
                    [
                        Text(
                            "I scraped the link with Scraper Studio and registered a new "
                            "Semiconductor Fab Lab in Okhla, Delhi into the atlas."
                        )
                    ]
                ),
            ]
        )

        async def _completer(conv: Any, defs: Any) -> Reply:
            return next(turns)

        app_instance.state.completer = _completer

        res = await client.post(
            "/api/chat",
            json={"message": "Scrape this link: https://example.test/semi-fab-okhla"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["grounded"] is True
        assert "scrape_custom_url" in data["tools_used"]
        assert "Semiconductor Fab Lab" in data["reply"]
