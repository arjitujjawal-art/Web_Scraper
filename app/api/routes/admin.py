"""Admin operations: the three routes that start real Bright Data jobs.

All three are `202 Accepted`, never `200`. `brightdata scraper heal` blocks for up
to 600 seconds — longer than any sane HTTP timeout — so the request records a job
row, returns its `run_id`, and the client polls
`GET /api/collector-runs/{run_id}`. See `docs/adr/0001-async-cli-jobs.md`.

All three require `X-Admin-Key`. They consume account job slots, and `approve`
permanently rewrites a collector's extraction logic.

`--auto-approve` is never passed to the CLI. The gap between `heal` and `approve` —
a human reading a diff and deciding — is the product, not an inconvenience to
automate away.
"""

from fastapi import APIRouter, status

from app.api.deps import DispatcherDep
from app.api.security import AdminGuard
from app.infra.db.models import CollectorRunRow
from app.schemas.collectors import HealRequest, RunRequest
from app.schemas.common import Acknowledgement

router = APIRouter(
    prefix="/collectors",
    tags=["admin"],
    dependencies=[AdminGuard],
    responses={
        401: {"description": "Missing or invalid X-Admin-Key"},
        409: {"description": "Collector disabled, unprovisioned, or nothing to approve"},
    },
)


def _accepted(row: CollectorRunRow) -> Acknowledgement:
    """Build the 202 body, including the URL the client should poll.

    Handing back the poll URL rather than documenting it is the difference between
    a frontend developer wiring this up in one minute or ten.
    """
    return Acknowledgement(
        run_id=row.run_id,
        collector_key=row.collector_key,
        action=str(row.action),
        status=str(row.status),
        poll_url=f"/api/collector-runs/{row.run_id}",
    )


@router.post(
    "/{collector_key}/run",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=Acknowledgement,
    summary="Queue a collector run",
)
async def queue_run(
    collector_key: str, dispatcher: DispatcherDep, body: RunRequest | None = None
) -> Acknowledgement:
    """Run a collector against one of its registered URLs.

    `body.url` must already appear in the collector's registry entry. That is the
    whole SSRF defence: there is no code path from a request body to an arbitrary
    fetch target, so no allowlist has to be maintained.
    """
    row = await dispatcher.dispatch_run(collector_key, body.url if body else None)
    return _accepted(row)


@router.post(
    "/{collector_key}/heal",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=Acknowledgement,
    summary="Request an AI repair for a broken collector",
)
async def queue_heal(
    collector_key: str, body: HealRequest, dispatcher: DispatcherDep
) -> Acknowledgement:
    """Send a plain-English description of what moved on the page.

    The prompt is capped at 1000 characters by the CLI itself, so it is validated
    here and rejected with a 422 rather than after a ten-minute round trip. The
    repair comes back gated: poll the run and read `diff_summary` and
    `preview_rows` before approving.
    """
    row = await dispatcher.dispatch_heal(collector_key, body.prompt)
    return _accepted(row)


@router.post(
    "/{collector_key}/approve",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=Acknowledgement,
    summary="Apply a pending repair",
)
async def queue_approve(collector_key: str, dispatcher: DispatcherDep) -> Acknowledgement:
    """Apply the repair a previous heal proposed.

    Refuses with a 409 when nothing is awaiting approval, checked against our own
    run history — asking Bright Data would cost up to 600 seconds to learn the same
    thing. The check is repeated inside the job, because a human may have approved
    it from a terminal in the meantime.
    """
    row = await dispatcher.dispatch_approve(collector_key)
    return _accepted(row)
