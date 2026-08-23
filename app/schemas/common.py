"""Shared response conventions for every DTO.

`app/schemas/` is the only place that knows what the wire looks like. It imports
from `app.domain` for enums and nothing else — no `app.infra`, no `app.services`,
enforced by an import-linter contract. Routes hand it ORM rows and dataclasses
alike, which works because every model here reads attributes rather than keys.
"""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

# Scores and fill rates are floats with no meaningful precision past three
# decimals. The domain deliberately keeps its arithmetic unrounded — rounding
# there broke the source-cap invariant — so rounding for display happens here.
DISPLAY_PRECISION = 3


def rounded(value: float | None) -> float | None:
    """Round a float for display, preserving None."""
    return None if value is None else round(value, DISPLAY_PRECISION)


class ApiModel(BaseModel):
    """Base for every response model.

    `from_attributes` is what lets a route return a SQLAlchemy row or a frozen
    dataclass without the schema layer importing either type.
    """

    model_config = ConfigDict(from_attributes=True, extra="ignore")


class ErrorResponse(ApiModel):
    """The single error envelope. Every failure in this API looks like this.

    `code` is machine-readable and comes from `ServiceError.code`; `detail` is for
    a human. One shape means the frontend writes one error handler.
    """

    detail: str = Field(description="Human-readable explanation.")
    code: str = Field(default="error", description="Stable machine-readable code.")


class PageMeta(ApiModel):
    """Paging counters, so a client never has to guess whether more data exists."""

    total: int
    limit: int
    offset: int
    has_more: bool = False


class Acknowledgement(ApiModel):
    """The `202 Accepted` body returned by every admin operation.

    Carries the `poll_url` explicitly rather than expecting the client to build it:
    the async two-step is the one part of this API that surprises people, so the
    response tells them exactly what to do next.
    """

    run_id: str
    collector_key: str
    action: str
    status: str
    poll_url: str
    message: str = "queued; poll poll_url until status is SUCCEEDED or FAILED"


def attributes_of(obj: object, *names: str) -> dict[str, Any]:
    """Pull named attributes into a dict, for the few hand-built responses.

    Used where a response mixes a row with computed values and
    `model_validate(row)` would need a wrapper object nobody else wants.
    """
    return {name: getattr(obj, name, None) for name in names}
