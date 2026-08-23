"""Health DTO."""

from datetime import datetime

from app.schemas.common import ApiModel


class HealthOut(ApiModel):
    """`GET /api/health` — one request that tells you whether the demo will work.

    Deliberately more than `{"status": "ok"}`. `collectors_provisioned` catches the
    single most likely failure on demo day (a registry still full of `PENDING`
    ids), `signals` catches an empty database, and `active_jobs` shows whether a
    heal is still running before someone triggers another one.
    """

    status: str = "ok"
    app: str
    version: str
    signals: int = 0
    collectors: int = 0
    collectors_provisioned: int = 0
    collectors_need_attention: int = 0
    active_jobs: int = 0
    latest_signal_at: datetime | None = None
    copilot_enabled: bool = False
