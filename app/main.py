"""Application factory. Composition only — no logic lives here.

`create_app()` builds the singletons, hangs them on `app.state`, registers the
router and the error handlers, and returns. Every long-lived object is constructed
in exactly one place, which is what lets a test build the same application with a
`FakeCli` and an in-memory database by overriding two dependencies.

There is deliberately **no module-level `app`**. Importing this module must not open
a database engine or read the collector registry, so the server is started through
the factory:

    py -3.12 -m uvicorn app.main:create_app --factory --reload

The lifespan hook is where the operational promises are kept: refuse to serve with
an unset admin key, create the schema, and cancel outstanding jobs on shutdown so a
reload cannot orphan a subprocess holding a Bright Data job slot.
"""

import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.errors import register_exception_handlers
from app.api.routes import api_router
from app.config import Settings, get_settings
from app.infra.cli.bdata import BdataCli
from app.infra.db.session import create_engine, create_schema, create_session_factory
from app.infra.registry import load_registry
from app.services.clock import utcnow
from app.services.jobs import JobRunner

logger = logging.getLogger(__name__)

DESCRIPTION = """\
Signal Atlas detects **signal convergence** — independent early public signals \
(university research, incubator news, startup announcements, tech events) that \
cluster on the same city and technology domain — and scores the result as an \
emerging opportunity zone.

Collectors are Bright Data Scraper Studio collectors driven through the `brightdata` \
CLI. When a source page changes layout, the collector degrades visibly (fill rate \
drops, health goes DEGRADED) and is repaired through an approval-gated AI heal.

Admin routes (`run`, `heal`, `approve`) require an `X-Admin-Key` header and return \
`202 Accepted` with a `run_id` to poll: a heal can take ten minutes, which no HTTP \
request should wait for.\
"""


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Start-up and shutdown, both explicit.

    Schema creation is `create_all` — no migrations. For a seven-day single-node
    build that is the honest trade, and it is named in the README rather than
    implied away.
    """
    settings: Settings = app.state.settings
    settings.ensure_serving_is_safe()

    await create_schema(app.state.engine)
    logger.info(
        "app.started",
        extra={
            "collectors": len(app.state.registry),
            "database": settings.database_url.split("://", 1)[0],
        },
    )
    try:
        yield
    finally:
        await app.state.job_runner.shutdown()
        await app.state.engine.dispose()
        logger.info("app.stopped")


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the application.

    Args:
        settings: Override for tests. Defaults to the cached process settings.
    """
    resolved = settings or get_settings()

    app = FastAPI(
        title=resolved.app_name,
        version=resolved.app_version,
        description=DESCRIPTION,
        lifespan=lifespan,
        docs_url="/docs",
        openapi_url="/openapi.json",
    )

    engine = create_engine(resolved.database_url, echo=resolved.debug)
    app.state.settings = resolved
    app.state.engine = engine
    app.state.session_factory = create_session_factory(engine)
    app.state.registry = load_registry(resolved.registry_path, environment=_registry_env(resolved))
    app.state.cli = BdataCli(settings=resolved)
    app.state.job_runner = JobRunner(app.state.session_factory, limit=resolved.cli_max_concurrency)
    app.state.clock = utcnow

    # No `allow_credentials=True`: this API uses a header key, never a cookie, and
    # credentialed CORS with a wildcard origin is rejected by browsers anyway.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved.cors_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "X-Admin-Key"],
    )

    register_exception_handlers(app)
    app.include_router(api_router)

    @app.get("/", include_in_schema=False)
    async def root() -> dict[str, str]:
        return {
            "name": resolved.app_name,
            "version": resolved.app_version,
            "docs": "/docs",
            "health": "/api/health",
        }

    return app


def _registry_env(settings: Settings) -> dict[str, str]:
    """Values available to `${...}` placeholders in `collectors/registry.yaml`.

    `FIXTURE_BASE_URL` is read through `Settings` rather than straight from the
    process environment, so it can be set in `.env` like everything else. An unset
    value is a startup failure by design: substituting an empty string would give
    the demo collector the URL `/newsroom_v1.html`, which the CLI accepts and then
    scrapes nothing from — a broken demo that looks like a broken collector.
    """
    env = dict(os.environ)
    if settings.fixture_base_url:
        env["FIXTURE_BASE_URL"] = settings.fixture_base_url
    return env


# Module-level ASGI application instance for standard uvicorn runners
# (e.g. Dockerfile `app.main:app`)
app = create_app()
