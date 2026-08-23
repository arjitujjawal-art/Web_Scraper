"""Route modules, assembled into one `/api` router.

Read routes are public so the frontend needs no secret in the browser. The three
admin routes carry their own `X-Admin-Key` dependency, declared on the router in
`admin.py` rather than per handler — a new admin endpoint added to that module is
protected by default instead of by remembering.
"""

from fastapi import APIRouter

from app.api.routes import (
    adhoc,
    admin,
    chat,
    collector_runs,
    collectors,
    health,
    jobs,
    signals,
    zones,
)

api_router = APIRouter(prefix="/api")

# Order matters for the two `/collectors` routers only in documentation grouping;
# the paths themselves do not overlap (`/{key}` vs `/{key}/run`).
api_router.include_router(health.router)
api_router.include_router(signals.router)
api_router.include_router(zones.router)
api_router.include_router(collectors.router)
api_router.include_router(collector_runs.router)
api_router.include_router(adhoc.router)
api_router.include_router(jobs.router)
api_router.include_router(admin.router)
api_router.include_router(chat.router)

__all__ = ["api_router"]
