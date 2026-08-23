"""Orchestration: the only layer that is allowed to combine I/O with decisions.

Each service takes its dependencies through `__init__` — a session, the CLI
protocol, the registry, settings, a clock — and never reaches for a global. That is
what lets the integration tests run the entire degrade → heal → approve → recover
cycle against `FakeCli` and an in-memory database, with no API key and no network.

Layering, enforced by `lint-imports` rather than by review:

    api  ->  services  ->  infra  ->  domain

`app/domain/` imports nothing from here. Services own the clock; the domain
receives `now` as an argument.
"""

from app.services.clock import Clock, fixed_clock, utcnow
from app.services.collectors import CollectorService, CollectorStatus
from app.services.errors import (
    CollectorDisabled,
    CollectorNotProvisioned,
    CopilotUnavailable,
    NothingToApprove,
    RunNotFound,
    ServiceError,
    ZoneNotFound,
)
from app.services.healing import HealingService
from app.services.ingest import IngestService
from app.services.jobs import JobDispatcher, JobRunner
from app.services.signals import SignalPage, SignalService
from app.services.zones import ZoneService

__all__ = [
    "Clock",
    "CollectorDisabled",
    "CollectorNotProvisioned",
    "CollectorService",
    "CollectorStatus",
    "CopilotUnavailable",
    "HealingService",
    "IngestService",
    "JobDispatcher",
    "JobRunner",
    "NothingToApprove",
    "RunNotFound",
    "ServiceError",
    "SignalPage",
    "SignalService",
    "ZoneNotFound",
    "ZoneService",
    "fixed_clock",
    "utcnow",
]
