"""Frozen value objects passed between layers.

Every type here is immutable and hashable where practical. Mutation is expressed
as "build a new one", which keeps the pipeline stages independent: the normalizer
cannot corrupt what the validator already inspected.
"""

from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from app.domain.enums import (
    Confidence,
    SignalType,
    SourceType,
)


@dataclass(frozen=True, slots=True)
class RawRecord:
    """One row exactly as a Scraper Studio collector emitted it.

    `brightdata scraper run` returns a bare JSON array whose rows are documented
    as "per-row best-effort": absent values are *omitted* rather than set to null.
    That distinction is why `fields` is a plain mapping and why every reader must
    use `.get`, never `[]`.
    """

    fields: Mapping[str, Any]
    collector_key: str
    source_url: str | None = None

    def value(self, name: str) -> Any:
        """Return a field, or None when the collector omitted it."""
        return self.fields.get(name)

    def has(self, name: str) -> bool:
        """Report whether a field is present *and* carries a usable value.

        An empty string and a whitespace-only string both count as missing: a
        collector that returns `""` after a layout change has failed just as
        surely as one that omits the key.
        """
        raw = self.fields.get(name)
        if raw is None:
            return False
        if isinstance(raw, str):
            return bool(raw.strip())
        if isinstance(raw, list | tuple | dict):
            return bool(raw)
        return True


@dataclass(frozen=True, slots=True)
class Coordinates:
    """A WGS84 point.

    Latitude first, matching the marker constructors in Leaflet and Mapbox.
    """

    latitude: float
    longitude: float


@dataclass(frozen=True, slots=True)
class NormalizedSignal:
    """A validated, canonical signal ready for scoring and storage.

    `evidence_urls` starts as the single source URL and grows when deduplication
    merges near-identical reports of the same event. It is the data behind the
    "3 outlets reported this, counted once" line in the UI.
    """

    signal_id: str
    collector_key: str
    source_type: SourceType
    source_url: str
    title: str
    date: datetime
    city: str
    domain: str
    signal_type: SignalType
    summary: str
    extracted_at: datetime
    area: str | None = None
    evidence_urls: tuple[str, ...] = ()

    @property
    def evidence_count(self) -> int:
        """How many independent reports this signal represents."""
        return max(1, len(self.evidence_urls))


@dataclass(frozen=True, slots=True)
class SourceContribution:
    """One source type's share of a zone's raw score, before capping."""

    source_type: SourceType
    raw: float
    capped: float

    @property
    def was_capped(self) -> bool:
        """Whether the concentration cap reduced this contribution."""
        return self.capped < self.raw


@dataclass(frozen=True, slots=True)
class Zone:
    """A (city, domain) bin with its emergence score and supporting evidence."""

    zone_id: str
    city: str
    domain: str
    score: float
    confidence: Confidence
    coordinates: Coordinates
    signal_count: int
    deduplicated_count: int
    distinct_source_types: int
    contributions: tuple[SourceContribution, ...] = ()
    signal_ids: tuple[str, ...] = ()

    @property
    def was_capped(self) -> bool:
        """Whether any single source type hit the concentration ceiling."""
        return any(c.was_capped for c in self.contributions)


@dataclass(frozen=True, slots=True)
class RunReport:
    """The quality verdict on one collector run.

    Persisted verbatim on `collector_runs`, which is what makes the failure
    visible on the dashboard instead of buried in a log line.
    """

    records_found: int
    required_fields_total: int
    required_fields_present: int
    fill_rate: float
    missing_fields: tuple[str, ...]
    rejected_records: int = 0
    rejection_reasons: tuple[str, ...] = field(default=())

    @property
    def is_empty(self) -> bool:
        """Whether the collector returned nothing at all."""
        return self.records_found == 0


@dataclass(frozen=True, slots=True)
class NormalizationOutcome:
    """Result of normalizing a batch: what survived, and why the rest did not.

    Rejections are returned rather than logged-and-dropped so the API can show
    "6 of 8 records usable" instead of silently under-reporting.
    """

    signals: tuple[NormalizedSignal, ...]
    rejections: tuple[tuple[int, str], ...] = ()

    @property
    def rejected_count(self) -> int:
        """Number of records that could not be normalized."""
        return len(self.rejections)

    def reasons(self) -> tuple[str, ...]:
        """Distinct rejection reasons, in first-seen order."""
        seen: dict[str, None] = {}
        for _, reason in self.rejections:
            seen.setdefault(reason, None)
        return tuple(seen)


def as_sequence(values: Sequence[str] | None) -> tuple[str, ...]:
    """Normalize an optional sequence into a tuple, for frozen dataclass fields."""
    return tuple(values) if values else ()
