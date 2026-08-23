"""Zone DTOs — what the map renders.

Every field the frontend needs to draw and explain a marker is here: position,
score, confidence, how many records collapsed into how many events, and which
source types carried the score. The "why is this flagged?" panel is built entirely
from `contributions` plus `deduplicated_count`, with no second request.
"""

from pydantic import Field, field_serializer

from app.domain.enums import Confidence, SourceType
from app.schemas.common import DISPLAY_PRECISION, ApiModel
from app.schemas.signals import SignalOut


class CoordinatesOut(ApiModel):
    """Marker position, WGS84."""

    latitude: float
    longitude: float


class SourceContributionOut(ApiModel):
    """One source type's share of a zone's score.

    `raw` and `capped` are both returned so the UI can show *"university research
    was capped at 60% of this score"* — the guardrail is a feature, and hiding it
    would make the number look arbitrary.
    """

    source_type: SourceType
    raw: float
    capped: float
    was_capped: bool = False

    @field_serializer("raw", "capped")
    def _round(self, value: float) -> float:
        return round(value, DISPLAY_PRECISION)


class ZoneOut(ApiModel):
    """A scored (city, domain) convergence zone."""

    zone_id: str
    city: str
    domain: str
    score: float
    confidence: Confidence
    coordinates: CoordinatesOut
    signal_count: int
    deduplicated_count: int
    distinct_source_types: int
    was_capped: bool = False
    contributions: list[SourceContributionOut] = Field(default_factory=list)
    signal_ids: list[str] = Field(default_factory=list)

    @field_serializer("score")
    def _round_score(self, value: float) -> float:
        return round(value, DISPLAY_PRECISION)


class ZoneListOut(ApiModel):
    """All zones matching a filter, best score first."""

    items: list[ZoneOut] = Field(default_factory=list)
    total: int = 0


class ZoneSignalsOut(ApiModel):
    """A zone plus the deduplicated signals it was scored from."""

    zone_id: str
    city: str
    domain: str
    signals: list[SignalOut] = Field(default_factory=list)
