"""Dependency wiring. The only place the API layer learns what it is talking to.

Everything long-lived — the engine, the session factory, the collector registry,
the CLI adapter, the job runner — is built once in `app/main.py` and parked on
`app.state`. These functions read it back. Nothing here constructs a singleton, so
there is no import-time side effect and no module-level global to reset between
tests.

That indirection is what makes the integration suite honest: a test overrides
`get_cli` with `FakeCli` and the entire pipeline runs unchanged, with no API key
and no network.
"""

from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.config import Settings
from app.infra.cli.protocol import ScraperCli
from app.infra.db.session import session_scope
from app.infra.registry import CollectorRegistry
from app.services.clock import Clock, utcnow
from app.services.collectors import CollectorService
from app.services.copilot import CopilotService, SignalTools
from app.services.jobs import JobDispatcher, JobRunner
from app.services.signals import SignalService
from app.services.zones import ZoneService


def get_settings(request: Request) -> Settings:
    """Process settings, resolved at startup."""
    settings: Settings = request.app.state.settings
    return settings


def get_registry(request: Request) -> CollectorRegistry:
    """The collector registry loaded from `collectors/registry.yaml`."""
    registry: CollectorRegistry = request.app.state.registry
    return registry


def get_session_factory(request: Request) -> async_sessionmaker[AsyncSession]:
    """The session factory, for code that must open its own transaction."""
    factory: async_sessionmaker[AsyncSession] = request.app.state.session_factory
    return factory


def get_cli(request: Request) -> ScraperCli:
    """The Bright Data CLI adapter — `BdataCli` in production, `FakeCli` in tests."""
    cli: ScraperCli = request.app.state.cli
    return cli


def get_job_runner(request: Request) -> JobRunner:
    """The process-wide background job runner."""
    runner: JobRunner = request.app.state.job_runner
    return runner


def get_clock(request: Request) -> Clock:
    """The injected clock. Overridden by tests to freeze decay-sensitive scores."""
    clock: Clock = getattr(request.app.state, "clock", utcnow)
    return clock


async def get_session(
    factory: Annotated[async_sessionmaker[AsyncSession], Depends(get_session_factory)],
) -> AsyncIterator[AsyncSession]:
    """One transaction per request, committed on success and rolled back on error.

    Background jobs deliberately do *not* use this: their session must outlive the
    request that queued them, so `JobRunner` opens its own.
    """
    async with session_scope(factory) as session:
        yield session


SettingsDep = Annotated[Settings, Depends(get_settings)]
RegistryDep = Annotated[CollectorRegistry, Depends(get_registry)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]
SessionFactoryDep = Annotated[async_sessionmaker[AsyncSession], Depends(get_session_factory)]
CliDep = Annotated[ScraperCli, Depends(get_cli)]
JobRunnerDep = Annotated[JobRunner, Depends(get_job_runner)]
ClockDep = Annotated[Clock, Depends(get_clock)]


def get_signal_service(session: SessionDep, clock: ClockDep) -> SignalService:
    """Read access to stored signals."""
    return SignalService(session=session, clock=clock)


def get_zone_service(session: SessionDep, settings: SettingsDep, clock: ClockDep) -> ZoneService:
    """Zone scoring, derived per request from the stored signals."""
    return ZoneService(session=session, settings=settings, clock=clock)


def get_collector_service(session: SessionDep, registry: RegistryDep) -> CollectorService:
    """The collector dashboard: registry config joined to run history."""
    return CollectorService(session=session, registry=registry)


def get_dispatcher(
    runner: JobRunnerDep,
    factory: SessionFactoryDep,
    cli: CliDep,
    registry: RegistryDep,
    settings: SettingsDep,
    clock: ClockDep,
) -> JobDispatcher:
    """The admin write path.

    Built per request from the same singletons, because a dispatcher holds no state
    of its own — the queue lives in `JobRunner` and the truth lives in the database.
    """
    return JobDispatcher(
        runner=runner,
        session_factory=factory,
        cli=cli,
        registry=registry,
        settings=settings,
        clock=clock,
    )


SignalServiceDep = Annotated[SignalService, Depends(get_signal_service)]
ZoneServiceDep = Annotated[ZoneService, Depends(get_zone_service)]
CollectorServiceDep = Annotated[CollectorService, Depends(get_collector_service)]
DispatcherDep = Annotated[JobDispatcher, Depends(get_dispatcher)]


def get_copilot_service(
    signals: SignalServiceDep,
    zones: ZoneServiceDep,
    settings: SettingsDep,
    request: Request,
) -> CopilotService:
    """Assemble the Copilot over the same services the REST API uses.

    `app.state.completer` is the seam the tests replace: set it to a stub and the
    entire tool loop runs with no Anthropic key and no network. Left unset in
    production, the service builds a real client on first use — or raises
    `CopilotUnavailable`, which the error handler turns into a clean 503.
    """
    return CopilotService(
        tools=SignalTools(signals=signals, zones=zones),
        settings=settings,
        completer=getattr(request.app.state, "completer", None),
    )


CopilotServiceDep = Annotated[CopilotService, Depends(get_copilot_service)]
