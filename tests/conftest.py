"""Shared fixtures for the whole suite.

Two promises are kept here, and they are the reason this project can be graded
without credentials:

1. **No network, no API key, no `brightdata` binary.** `FakeCli` replays the
   recorded envelopes in `tests/fixtures/cli/`, injected through the same
   `get_cli` dependency the real application uses.
2. **No shared state between tests.** Each test gets its own SQLite *file* under
   `tmp_path` and its own registry, so run history from one test cannot decide
   another one's dashboard.

The application under test is built by the production `create_app` factory. The
only things swapped are the CLI and the clock — if the wiring in `app/main.py`
breaks, these tests break, which is the point.
"""

from collections.abc import AsyncIterator, Iterator
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from app.api.deps import get_cli
from app.config import Settings
from app.infra.cli.fake import FakeCli
from app.main import create_app
from app.services.clock import Clock
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

TESTS_DIR = Path(__file__).resolve().parent

# The recorded fixtures carry dates from 2026-07-24 to 2026-08-14. "Now" sits a
# week past the newest of them, so every signal has a positive age and time decay
# is actually exercised rather than multiplied by e^0.
FROZEN_NOW = datetime(2026, 8, 22, 12, 0, tzinfo=UTC)

# Long enough to satisfy `ensure_serving_is_safe`, and obviously not a real key.
ADMIN_KEY = "test-admin-key-not-a-real-secret"

# A public-looking host: the point of the placeholder is that fixtures are reachable
# from Bright Data's infrastructure, so a `localhost` URL here would misrepresent
# what the registry expands to in production.
FIXTURE_BASE_URL = "https://example.test/signal-atlas/fixtures"

TEST_REGISTRY_PATH = TESTS_DIR / "fixtures" / "registry" / "test_registry.yaml"
REAL_REGISTRY_PATH = TESTS_DIR.parent / "collectors" / "registry.yaml"

BASELINE_URL = f"{FIXTURE_BASE_URL}/newsroom_v1.html"
MUTATED_URL = f"{FIXTURE_BASE_URL}/newsroom_v2_mutated.html"

DEMO_KEY = "demo_newsroom"
DISABLED_KEY = "startup_news_delhi"
UNPROVISIONED_KEY = "tech_events_delhi"


@pytest.fixture
def frozen_now() -> datetime:
    """The instant unit tests measure ages against."""
    return FROZEN_NOW


@pytest.fixture
def stepping_clock() -> Clock:
    """A clock that advances one second per call.

    Run rows are ordered by `started_at`, and `latest_for` / `latest_awaiting_approval`
    read the newest row. A genuinely frozen clock would stamp five rows in the
    healing cycle with the identical timestamp and leave "which is latest" to
    SQLite's tie-breaking — a test that passes by luck. Stepping keeps the ordering
    total while holding the drift far below the one-day granularity of decay.
    """
    ticks = 0

    def clock() -> datetime:
        nonlocal ticks
        ticks += 1
        return FROZEN_NOW + timedelta(seconds=ticks)

    return clock


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    """Test settings: temp database, temp payload dir, test registry.

    A temp *file* rather than `:memory:` — an in-memory SQLite database belongs to
    one connection, and the async pool may hand a background job a different one.
    Explicit keyword arguments outrank both `.env` and the ambient environment, so
    a developer's real `DATABASE_URL` cannot reach the suite.
    """
    return Settings(
        admin_api_key=ADMIN_KEY,
        database_url=f"sqlite+aiosqlite:///{(tmp_path / 'test.db').as_posix()}",
        raw_payload_dir=tmp_path / "raw",
        registry_path=TEST_REGISTRY_PATH,
        fixture_base_url=FIXTURE_BASE_URL,
        frontend_origins="http://localhost:5173",
        groq_api_key="",
        openai_api_key="",
        anthropic_api_key="",
        cli_max_concurrency=1,
    )


@pytest.fixture
def fake_cli() -> FakeCli:
    """An unscripted fake CLI; each test enqueues the outcomes it expects."""
    return FakeCli()


@pytest.fixture
def app_instance(settings: Settings, fake_cli: FakeCli, stepping_clock: Clock) -> Iterator[FastAPI]:
    """The real application, with the CLI and the clock swapped out."""
    app = create_app(settings)
    app.state.cli = fake_cli
    app.state.clock = stepping_clock
    app.dependency_overrides[get_cli] = lambda: fake_cli
    yield app
    app.dependency_overrides.clear()


@pytest.fixture
async def client(app_instance: FastAPI) -> AsyncIterator[AsyncClient]:
    """An ASGI client with the lifespan actually running.

    `ASGITransport` alone never fires startup, so the schema would not exist and
    `ensure_serving_is_safe` would never be checked. Entering the lifespan context
    by hand keeps both in the test path.
    """
    async with app_instance.router.lifespan_context(app_instance):
        transport = ASGITransport(app=app_instance)
        async with AsyncClient(transport=transport, base_url="http://testserver") as http_client:
            yield http_client


@pytest.fixture
def admin_headers() -> dict[str, str]:
    """The header that unlocks `run`, `heal` and `approve`."""
    return {"X-Admin-Key": ADMIN_KEY}
