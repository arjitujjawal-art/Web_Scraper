"""Signal DTOs — the evidence rows behind every zone."""

from datetime import datetime

from pydantic import Field, field_serializer

from app.domain.enums import SignalType, SourceType
from app.schemas.common import ApiModel, PageMeta


class SignalOut(ApiModel):
    """One normalized signal.

    `evidence_urls` and `evidence_count` are the deduplication story made visible:
    when three outlets report one lab opening, the map shows one signal and this
    field shows the three sources it was merged from.
    """

    signal_id: str
    collector_key: str
    source_type: SourceType
    source_url: str
    title: str
    summary: str
    date: datetime
    city: str
    domain: str
    signal_type: SignalType
    area: str | None = None
    extracted_at: datetime
    evidence_urls: tuple[str, ...] = ()
    evidence_count: int = 1

    @field_serializer("evidence_urls")
    def _serialize_evidence(self, value: tuple[str, ...]) -> list[str]:
        """Emit a JSON array rather than a tuple-shaped one."""
        return list(value)


class SignalListOut(ApiModel):
    """A page of signals with its counters."""

    items: list[SignalOut] = Field(default_factory=list)
    meta: PageMeta
