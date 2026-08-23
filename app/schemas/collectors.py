"""Collector and run DTOs — the health dashboard and the admin request bodies.

The request models here are the security boundary in schema form. `RunRequest`
accepts a `url` but it is validated against the collector's own registered URLs
server-side, so the field cannot become an arbitrary fetch target. `HealRequest`
caps the prompt at 1000 characters because the Bright Data CLI does, and failing
at the edge with a 422 beats failing after a ten-minute round trip.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_serializer

from app.domain.enums import CollectorAction, CollectorHealth, RunStatus, SourceType
from app.schemas.common import DISPLAY_PRECISION, ApiModel

# Mirrors the CLI's own client-side cap. Kept as a literal with this comment
# rather than imported from config: it is a property of the tool, not of our
# deployment, so an operator must not be able to raise it in `.env`.
HEAL_PROMPT_MAX_CHARS = 1000


class CollectorOut(ApiModel):
    """One collector's configuration and latest observed health."""

    key: str
    source_type: SourceType
    collector_id: str
    urls: list[str] = Field(default_factory=list)
    city_hint: str | None = None
    description: str | None = None
    required_fields: list[str] = Field(default_factory=list)
    enabled: bool = True
    is_provisioned: bool = False
    health: CollectorHealth = CollectorHealth.UNKNOWN
    awaiting_approval: bool = False
    needs_attention: bool = False
    last_run_id: str | None = None
    last_action: CollectorAction | None = None
    last_status: RunStatus | None = None
    last_run_at: datetime | None = None
    last_fill_rate: float | None = None
    last_records_found: int | None = None
    last_error: str | None = None
    notes: str | None = None

    @field_serializer("last_fill_rate")
    def _round_fill_rate(self, value: float | None) -> float | None:
        return None if value is None else round(value, DISPLAY_PRECISION)


class CollectorListOut(ApiModel):
    """Every registered collector, in registry order."""

    items: list[CollectorOut] = Field(default_factory=list)
    total: int = 0
    needs_attention: int = 0


class RunReportOut(ApiModel):
    """The quality verdict on a run — the numbers that make degradation visible."""

    records_found: int = 0
    records_stored: int = 0
    required_fields_total: int = 0
    required_fields_present: int = 0
    fill_rate: float = 0.0
    missing_fields: list[str] = Field(default_factory=list)
    rejected_records: int = 0
    rejection_reasons: list[str] = Field(default_factory=list)

    @field_serializer("fill_rate")
    def _round_fill_rate(self, value: float) -> float:
        return round(value, DISPLAY_PRECISION)


class CollectorRunOut(ApiModel):
    """One `run`, `heal` or `approve`, with everything observed about it.

    This is the polling response. `status.is_terminal` on the domain enum is the
    signal a client waits for; `health` is what the dashboard colours by. The
    healing fields (`diff_summary`, `next_step`, `preview_rows`) are populated only
    on a gated heal — they *are* the proposed repair, shown before a human applies
    it.
    """

    run_id: str
    collector_key: str
    collector_id: str
    action: CollectorAction
    status: RunStatus
    health: CollectorHealth
    target_url: str | None = None

    records_found: int = 0
    records_stored: int = 0
    fill_rate: float = 0.0
    missing_fields: list[str] = Field(default_factory=list)
    rejected_records: int = 0
    rejection_reasons: list[str] = Field(default_factory=list)

    cli_status: str | None = None
    view_url: str | None = None
    diff_summary: str | None = None
    next_step: str | None = None
    preview_rows: list[dict[str, Any]] | None = None
    heal_prompt: str | None = None

    error: str | None = None
    notes: str | None = None
    started_at: datetime
    finished_at: datetime | None = None
    duration_seconds: float | None = None

    @field_serializer("fill_rate")
    def _round_fill_rate(self, value: float) -> float:
        return round(value, DISPLAY_PRECISION)


class CollectorRunListOut(ApiModel):
    """Run history, newest first."""

    items: list[CollectorRunOut] = Field(default_factory=list)
    total: int = 0


class RunRequest(BaseModel):
    """Body for `POST /api/collectors/{key}/run`.

    `url` selects among the collector's *registered* URLs — it is an index into
    committed configuration, not a target. Omit it for the primary URL. The healing
    demo uses it to point one collector at a second, mutated page.
    """

    model_config = ConfigDict(extra="forbid")

    url: str | None = Field(
        default=None,
        max_length=2048,
        description="One of the collector's registered URLs. Defaults to the first.",
    )


class HealRequest(BaseModel):
    """Body for `POST /api/collectors/{key}/heal`.

    The prompt is plain English describing what moved on the page — the same text a
    human would type into `brightdata scraper heal`. Nothing is templated into a
    shell command; it is passed as a single argv element.
    """

    model_config = ConfigDict(extra="forbid")

    prompt: str = Field(
        min_length=1,
        max_length=HEAL_PROMPT_MAX_CHARS,
        description=(
            "What changed on the page, in plain English. "
            f"Hard-capped at {HEAL_PROMPT_MAX_CHARS} characters by the Bright Data CLI."
        ),
        examples=[
            "Article titles moved from article.news-card h2 to div.press-wrapper h3, "
            "and the date is now in span.release-date."
        ],
    )
