"""Integration tests for the Signal Copilot (POST /api/chat).

Verifies tool loop execution, database grounding, job search, fleet health queries,
anti-hallucination guardrails, and graceful 503 unavailable responses when keys are absent.
"""

from dataclasses import dataclass
from typing import Any

import pytest
from app.domain.enums import SignalType, SourceType
from app.domain.models import JobPosting, NormalizedSignal
from httpx import AsyncClient

from tests.helpers import make_signal, store_jobs, store_signals


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


def _scenario_signals() -> tuple[NormalizedSignal, ...]:
    return (
        make_signal(
            signal_id="sig_delhi_ai_01",
            city="Delhi",
            domain="AI/ML",
            source_type=SourceType.STARTUP_NEWSROOM,
            signal_type=SignalType.FACILITY_EXPANSION,
            age_days=1,
            title="AI Lab launches in Gurugram",
            area="Gurugram",
        ),
        make_signal(
            signal_id="sig_delhi_ai_02",
            city="Delhi",
            domain="AI/ML",
            source_type=SourceType.UNIVERSITY_RESEARCH,
            signal_type=SignalType.RESEARCH_GRANT,
            age_days=3,
            title="IIT Delhi receives AI grant",
        ),
        make_signal(
            signal_id="sig_sf_robotics_01",
            city="San Francisco",
            domain="Robotics",
            source_type=SourceType.INCUBATOR_NEWS,
            signal_type=SignalType.TECH_EVENT,
            age_days=2,
            title="SF Robotics Accelerator announces demo day",
        ),
    )


def _scenario_jobs() -> tuple[JobPosting, ...]:
    return (
        JobPosting(
            job_id="job_delhi_ml_01",
            title="Senior ML Engineer",
            company="CyberTech Labs",
            city="Delhi",
            domain="AI/ML",
            salary_range="₹24,00,000 - ₹30,00,000 PA",
            summary="Building transformer pipelines",
            skills=("Python", "PyTorch", "LLMs"),
            source_url="https://linkedin.com/jobs/view/101",
        ),
        JobPosting(
            job_id="job_sf_robotics_01",
            title="Robotics Control Lead",
            company="Aura Robotics",
            city="San Francisco",
            domain="Robotics",
            salary_range="$200,000 - $250,000",
            summary="Whole body locomotion control",
            skills=("C++", "ROS2", "Control Theory"),
            source_url="https://linkedin.com/jobs/view/102",
        ),
    )


class TestCopilotEndpoints:
    @pytest.mark.asyncio
    async def test_score_question_answered_with_grounding(
        self, client: AsyncClient, app_instance: Any
    ) -> None:
        await store_signals(app_instance, *_scenario_signals())

        turns = iter(
            [
                Reply(
                    [
                        ToolUse(
                            id="t1",
                            name="get_emergence_score",
                            input={"city": "Delhi", "domain": "AI/ML"},
                        )
                    ]
                ),
                Reply(
                    [
                        Text(
                            "Delhi AI/ML emergence score is 7.32 with "
                            "high confidence [sig_delhi_ai_01]."
                        )
                    ]
                ),
            ]
        )

        async def _completer(conv: Any, defs: Any) -> Reply:
            return next(turns)

        app_instance.state.completer = _completer

        res = await client.post(
            "/api/chat", json={"message": "What is the emergence score of Delhi AI/ML?"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["grounded"] is True
        assert "get_emergence_score" in data["tools_used"]
        assert "7.32" in data["reply"]

    @pytest.mark.asyncio
    async def test_signals_search_returns_citations(
        self, client: AsyncClient, app_instance: Any
    ) -> None:
        await store_signals(app_instance, *_scenario_signals())

        turns = iter(
            [
                Reply(
                    [
                        ToolUse(
                            id="t1",
                            name="search_signals",
                            input={"city": "Delhi", "domain": "AI/ML"},
                        )
                    ]
                ),
                Reply([Text("Found signals for AI in Delhi [sig_delhi_ai_01].")]),
            ]
        )

        async def _completer(conv: Any, defs: Any) -> Reply:
            return next(turns)

        app_instance.state.completer = _completer

        res = await client.post("/api/chat", json={"message": "What signals are in Delhi?"})
        assert res.status_code == 200
        data = res.json()
        assert data["grounded"] is True
        assert "search_signals" in data["tools_used"]
        assert len(data["citations"]) > 0
        assert data["citations"][0]["signal_id"] == "sig_delhi_ai_01"

    @pytest.mark.asyncio
    async def test_active_jobs_search(self, client: AsyncClient, app_instance: Any) -> None:
        await store_jobs(app_instance, *_scenario_jobs())

        turns = iter(
            [
                Reply(
                    [
                        ToolUse(
                            id="t1",
                            name="search_active_jobs",
                            input={"city": "Delhi", "keyword": "ML Engineer"},
                        )
                    ]
                ),
                Reply(
                    [
                        Text(
                            "Found Senior ML Engineer at CyberTech Labs "
                            "in Delhi with salary ₹24-30 LPA."
                        )
                    ]
                ),
            ]
        )

        async def _completer(conv: Any, defs: Any) -> Reply:
            return next(turns)

        app_instance.state.completer = _completer

        res = await client.post("/api/chat", json={"message": "Are there ML jobs in Delhi?"})
        assert res.status_code == 200
        data = res.json()
        assert data["grounded"] is True
        assert "search_active_jobs" in data["tools_used"]
        assert "CyberTech Labs" in data["reply"]

    @pytest.mark.asyncio
    async def test_fleet_health_query(self, client: AsyncClient, app_instance: Any) -> None:
        turns = iter(
            [
                Reply(
                    [
                        ToolUse(
                            id="t1",
                            name="get_scraper_fleet_health",
                            input={},
                        )
                    ]
                ),
                Reply(
                    [
                        Text(
                            "All collectors in the fleet are operating normally. "
                            "To heal a collector run bdata scraper heal."
                        )
                    ]
                ),
            ]
        )

        async def _completer(conv: Any, defs: Any) -> Reply:
            return next(turns)

        app_instance.state.completer = _completer

        res = await client.post("/api/chat", json={"message": "How is the scraper fleet doing?"})
        assert res.status_code == 200
        data = res.json()
        assert data["grounded"] is True
        assert "get_scraper_fleet_health" in data["tools_used"]

    @pytest.mark.asyncio
    async def test_unknown_city_is_refused(self, client: AsyncClient, app_instance: Any) -> None:
        await store_signals(app_instance, *_scenario_signals())

        turns = iter(
            [
                Reply(
                    [
                        ToolUse(
                            id="t1",
                            name="get_emergence_score",
                            input={"city": "Mumbai", "domain": "AI/ML"},
                        )
                    ]
                ),
                Reply(
                    [
                        Text(
                            "Mumbai is not covered. "
                            "Currently indexed cities are Delhi and San Francisco."
                        )
                    ]
                ),
            ]
        )

        async def _completer(conv: Any, defs: Any) -> Reply:
            return next(turns)

        app_instance.state.completer = _completer

        res = await client.post("/api/chat", json={"message": "How is Mumbai AI/ML?"})
        assert res.status_code == 200
        data = res.json()
        assert data["grounded"] is False
        assert "Mumbai is not covered" in data["reply"]

    @pytest.mark.asyncio
    async def test_no_api_key_returns_503_unavailable(
        self, client: AsyncClient, app_instance: Any
    ) -> None:
        # Clear completer and unconfigure keys
        app_instance.state.completer = None
        app_instance.state.settings.groq_api_key = ""
        app_instance.state.settings.openai_api_key = ""
        app_instance.state.settings.anthropic_api_key = ""

        res = await client.post("/api/chat", json={"message": "Hello"})
        assert res.status_code == 503
        data = res.json()
        assert data["code"] == "copilot_unavailable"

    @pytest.mark.asyncio
    async def test_loop_terminates_at_max_iterations(
        self, client: AsyncClient, app_instance: Any
    ) -> None:
        # Stub that forever asks for search_signals
        async def _infinite_tools(conv: Any, defs: Any) -> Reply:
            return Reply(
                [
                    ToolUse(
                        id="loop_call",
                        name="get_scraper_fleet_health",
                        input={},
                    )
                ]
            )

        app_instance.state.completer = _infinite_tools
        app_instance.state.settings.copilot_max_tool_iterations = 3

        res = await client.post("/api/chat", json={"message": "Check status"})
        assert res.status_code == 200
        data = res.json()
        assert "could not finish looking that up" in data["reply"]
