"""Service-layer failures, mapped to HTTP by `app/api/errors.py`.

Services raise these instead of `HTTPException`. That keeps the orchestration
testable without a request context, and means the Copilot — which calls the same
services — gets a real exception rather than a 422 it cannot interpret.
"""


class ServiceError(RuntimeError):
    """Base class for expected, reportable service failures."""

    code = "service_error"


class CollectorNotProvisioned(ServiceError):
    """The registry entry exists but no `c_*` collector has been created for it yet."""

    code = "collector_not_provisioned"


class CollectorDisabled(ServiceError):
    """The collector is switched off in the registry."""

    code = "collector_disabled"


class NothingToApprove(ServiceError):
    """`approve` was called with no repair awaiting approval.

    Checked against our own run history first: the CLI would take up to 600 s to
    tell us the same thing.
    """

    code = "nothing_to_approve"


class RunNotFound(ServiceError):
    """A polled `run_id` does not exist."""

    code = "run_not_found"


class ZoneNotFound(ServiceError):
    """No zone matches the requested id at the current score threshold."""

    code = "zone_not_found"


class CopilotUnavailable(ServiceError):
    """The Copilot was called without an Anthropic API key configured."""

    code = "copilot_unavailable"
