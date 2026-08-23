"""Admin authentication for the three routes that spend money and time.

`POST /run`, `/heal` and `/approve` start real Bright Data jobs: they consume
account job slots, they can take ten minutes, and `approve` permanently rewrites a
collector's extraction logic. Read routes are open so the frontend needs no secret
in the browser; write routes require `X-Admin-Key`.

Two details that are easy to get wrong and matter here:

* the comparison uses `secrets.compare_digest`, so it does not leak the key's
  length or prefix through response timing;
* an empty configured key is treated as a **misconfiguration**, never as
  "everything is allowed". `Settings.ensure_serving_is_safe` already refuses to
  boot in that state; this is the second lock on the same door.
"""

import logging
import secrets

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader

from app.api.deps import SettingsDep

logger = logging.getLogger(__name__)

ADMIN_KEY_HEADER = "X-Admin-Key"

# `auto_error=False` so a missing header reaches our own check and produces the
# project's error envelope instead of FastAPI's default 403 body.
_admin_key_scheme = APIKeyHeader(name=ADMIN_KEY_HEADER, auto_error=False)


def require_admin_key(
    settings: SettingsDep,
    provided: str | None = Security(_admin_key_scheme),
) -> None:
    """Reject a request without a valid admin key.

    Returns nothing: the dependency exists for its side effect, and a route that
    declares it gains protection without threading an identity object it has no use
    for. There is one shared key — no users, no roles — and the README says so
    under Known Limitations rather than implying an auth system that does not exist.
    """
    expected = settings.admin_api_key.strip()
    if not expected:
        logger.error("security.admin_key_unset")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ADMIN_API_KEY is not configured; admin routes are disabled.",
        )

    if not provided or not secrets.compare_digest(provided.strip(), expected):
        logger.warning("security.admin_key_rejected")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Missing or invalid {ADMIN_KEY_HEADER} header.",
            headers={"WWW-Authenticate": ADMIN_KEY_HEADER},
        )


AdminGuard = Depends(require_admin_key)
