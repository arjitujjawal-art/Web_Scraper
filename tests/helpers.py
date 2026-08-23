"""Small helpers shared by the integration tests.

Kept out of `conftest.py` on purpose: these are plain functions, not fixtures, and
importing them explicitly makes each test say what machinery it depends on.
"""

import asyncio
from datetime import UTC, datetime, timedelta
from typing import Any

from app.domain.enums import SignalType, SourceType
from app.domain.models import NormalizedSignal
from app.infra.db.repositories import SignalRepository
from app.infra.db.session import session_scope
from fastapi import FastAPI
from httpx import AsyncClient

# The in-process job runner finishes a `FakeCli` job in microseconds, so polling is
# a formality — but it is the same polling a real client does, and a bounded loop
# turns "the task never ran" into a clear failure instead of a hung suite.
_POLL_ATTEMPTS = 400
_POLL_INTERVAL_SECONDS = 0.01

_TERMINAL = {"SUCCEEDED", "FAILED"}


async def poll_run(client: AsyncClient, run_id: str) -> dict[str, Any]:
    """Poll `GET /api/collector-runs/{run_id}` until the run reaches a terminal state.

    Returns the final run payload. Fails the test rather than looping forever if the
    background job never completes.
    """
    for _ in range(_POLL_ATTEMPTS):
        response = await client.get(f"/api/collector-runs/{run_id}")
        assert response.status_code == 200, response.text
        payload: dict[str, Any] = response.json()
        if payload["status"] in _TERMINAL:
            return payload
        await asyncio.sleep(_POLL_INTERVAL_SECONDS)
    raise AssertionError(f"run {run_id} never reached a terminal state")


async def dispatch(
    client: AsyncClient,
    path: str,
    headers: dict[str, str],
    body: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """POST an admin action, assert the 202, and wait for the run to finish.

    Every admin route follows the same contract — `202` plus a `run_id` and a
    `poll_url` — so the assertion belongs here once rather than in each test.
    """
    response = await client.post(path, headers=headers, json=body)
    assert response.status_code == 202, response.text
    acknowledgement = response.json()
    run_id = acknowledgement["run_id"]
    assert acknowledgement["poll_url"] == f"/api/collector-runs/{run_id}"
    assert acknowledgement["status"] == "QUEUED"
    return await poll_run(client, run_id)


async def store_signals(app: FastAPI, *signals: NormalizedSignal) -> None:
    """Write signals straight to the database, bypassing the collectors.

    Zone and signal queries need data that does not depend on a CLI fixture; going
    through the repository (not raw SQL) keeps the test honest about the write path.
    """
    async with session_scope(app.state.session_factory) as session:
        await SignalRepository(session).upsert_many(signals)


def make_signal(
    *,
    signal_id: str,
    city: str = "Delhi",
    domain: str = "AI/ML",
    source_type: SourceType = SourceType.STARTUP_NEWSROOM,
    signal_type: SignalType = SignalType.FACILITY_EXPANSION,
    age_days: int = 0,
    now: datetime | None = None,
    title: str | None = None,
    area: str | None = None,
    evidence_urls: tuple[str, ...] = (),
) -> NormalizedSignal:
    """Build a signal with as few arguments as the test actually cares about."""
    moment = now or datetime(2026, 8, 22, 12, 0, tzinfo=UTC)
    return NormalizedSignal(
        signal_id=signal_id,
        collector_key="test_collector",
        source_type=source_type,
        source_url=f"https://example.test/{signal_id}",
        title=title or f"Signal {signal_id}",
        date=moment - timedelta(days=age_days),
        city=city,
        domain=domain,
        signal_type=signal_type,
        summary=f"Summary for {signal_id}",
        extracted_at=moment,
        area=area,
        evidence_urls=evidence_urls,
    )
