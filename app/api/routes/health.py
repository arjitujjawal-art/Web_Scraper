"""Liveness and readiness in one response."""

from fastapi import APIRouter

from app.api.deps import CollectorServiceDep, JobRunnerDep, SettingsDep, SignalServiceDep
from app.schemas.health import HealthOut

router = APIRouter(tags=["meta"])


@router.get("/health", response_model=HealthOut, summary="Service and data health")
async def read_health(
    settings: SettingsDep,
    signals: SignalServiceDep,
    collectors: CollectorServiceDep,
    runner: JobRunnerDep,
) -> HealthOut:
    """Report whether this instance can actually serve the demo.

    Returns 200 even when the data is empty or collectors are unprovisioned — the
    numbers say so, and a load balancer should not kill a process because nobody has
    run a collector yet.
    """
    statuses = await collectors.list_statuses()
    return HealthOut(
        app=settings.app_name,
        version=settings.app_version,
        signals=await signals.total(),
        collectors=len(statuses),
        collectors_provisioned=sum(1 for status in statuses if status.is_provisioned),
        collectors_need_attention=sum(1 for status in statuses if status.needs_attention),
        active_jobs=runner.active_jobs,
        latest_signal_at=await signals.freshness(),
        copilot_enabled=bool(settings.anthropic_api_key.strip()),
    )
