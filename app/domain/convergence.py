"""Emergence scoring: time decay plus a source-concentration ceiling.

The score answers one question — *how much fresh, independent evidence is there
that this city/domain pair is becoming a hub?*

    S(city, domain) = SUM over deduplicated signals of  w(type) * e^(-lambda * age_days)

Two guardrails sit on top of the raw sum. Deduplication (see `dedup`) stops one
event counted three times. The concentration cap below stops one prolific source
carrying a zone on its own.
"""

import math
from collections import defaultdict
from collections.abc import Iterable, Mapping, Sequence
from datetime import datetime

from app.domain.dates import age_in_days
from app.domain.dedup import deduplicate
from app.domain.enums import Confidence, SignalType, SourceType
from app.domain.geo import zone_coordinates
from app.domain.models import NormalizedSignal, SourceContribution, Zone

# Static weights: a new lab is stronger evidence than a meetup.
WEIGHTS: Mapping[SignalType, float] = {
    SignalType.FACILITY_EXPANSION: 3.0,
    SignalType.RESEARCH_GRANT: 2.0,
    SignalType.TECH_EVENT: 1.0,
}

# lambda = 0.1/day gives a ~30-day effective window: a 30-day-old signal retains
# e^-3 ~ 5% of its weight.
TIME_DECAY_LAMBDA = 0.1

# No single source_type may account for more than this share of a zone's score.
SOURCE_CAP_RATIO = 0.6

_CONFIDENCE_BY_DISTINCT_SOURCES: Mapping[int, Confidence] = {
    0: Confidence.LOW,
    1: Confidence.LOW,
    2: Confidence.MEDIUM,
}


def signal_contribution(signal: NormalizedSignal, now: datetime) -> float:
    """Weighted, decayed contribution of one signal."""
    weight = WEIGHTS[signal.signal_type]
    return weight * math.exp(-TIME_DECAY_LAMBDA * age_in_days(signal.date, now))


def raw_contributions_by_source(
    signals: Iterable[NormalizedSignal], now: datetime
) -> dict[SourceType, float]:
    """Sum decayed contributions per source type, before capping."""
    totals: dict[SourceType, float] = defaultdict(float)
    for signal in signals:
        totals[signal.source_type] += signal_contribution(signal, now)
    return dict(totals)


def apply_source_cap(
    raw: Mapping[SourceType, float],
    cap_ratio: float = SOURCE_CAP_RATIO,
) -> tuple[float, tuple[SourceContribution, ...]]:
    """Enforce "no source type exceeds `cap_ratio` of the final score".

    The naive implementation — clip the dominant contribution to `total * cap` and
    re-sum — does not satisfy its own rule. With contributions 80 and 20 it yields
    a final of 80 in which the dominant source is 60/80 = 75%, still above a stated
    60% ceiling. The invariant has to be solved for, not approximated:

        others = total - dominant
        final  = min(total, others / (1 - cap_ratio))

    With 80 and 20 that gives 50, where the dominant source contributes 30 —
    exactly 60% of the final score. When the mix is already compliant, `others /
    (1 - cap)` exceeds `total` and the `min` leaves the score untouched.

    A single-source zone cannot satisfy the rule at any positive score, so it is
    handled explicitly rather than dividing by zero: clamp to `total * cap_ratio`
    and let `confidence_for` mark it LOW. The score should look less certain when
    nothing corroborates it.

    Nothing is rounded here. Rounding the score to two decimals while rounding the
    breakdown to four broke the invariant on small scores — a 0.0123 final rounds
    to 0.01 and the dominant share reads 0.74. Display precision is the schema
    layer's job; the domain keeps the arithmetic exact.

    Returns:
        The final score and the per-source breakdown, whose `capped` values sum to
        that score.
    """
    if not raw:
        return 0.0, ()
    if not 0.0 < cap_ratio < 1.0:
        raise ValueError(f"cap_ratio must be in (0, 1), got {cap_ratio}")

    total = sum(raw.values())
    if total <= 0.0:
        return 0.0, ()

    dominant_type = max(raw, key=lambda source: raw[source])
    dominant = raw[dominant_type]
    others = total - dominant

    if others <= 0.0:
        final = total * cap_ratio
        dominant_capped = final
    else:
        final = min(total, others / (1.0 - cap_ratio))
        dominant_capped = final - others

    breakdown = tuple(
        SourceContribution(
            source_type=source,
            raw=value,
            capped=dominant_capped if source is dominant_type else value,
        )
        for source, value in sorted(raw.items(), key=lambda item: -item[1])
    )
    return final, breakdown


def confidence_for(distinct_source_types: int) -> Confidence:
    """Map corroboration breadth onto a confidence label.

    Three or more independent source categories is the bar for HIGH — that is the
    definition of convergence this project is built on, so it should be visible on
    the map rather than buried in a score.
    """
    return _CONFIDENCE_BY_DISTINCT_SOURCES.get(distinct_source_types, Confidence.HIGH)


def zone_id_for(city: str, domain: str) -> str:
    """Deterministic zone identifier, e.g. `delhi-ai-ml`.

    Stable ids let the frontend deep-link a zone and let a judge re-run the
    pipeline and land on the same URLs.
    """
    from app.domain.normalizer import slugify  # noqa: PLC0415 — avoids an import cycle

    return f"{slugify(city)}-{slugify(domain)}"


def score_signals(signals: Sequence[NormalizedSignal], now: datetime) -> float:
    """Emergence score for an already-binned, already-deduplicated set."""
    score, _ = apply_source_cap(raw_contributions_by_source(signals, now))
    return score


def build_zone(
    city: str,
    domain: str,
    signals: Sequence[NormalizedSignal],
    now: datetime,
) -> Zone:
    """Score one (city, domain) bin and package it for the map.

    Deduplication happens here rather than upstream so that `signal_count` and
    `deduplicated_count` can both be reported: "9 records, 6 distinct events" is
    the sentence that makes the scoring credible.
    """
    deduped = deduplicate(signals)
    raw = raw_contributions_by_source(deduped, now)
    score, breakdown = apply_source_cap(raw)

    area = next((signal.area for signal in deduped if signal.area), None)

    return Zone(
        zone_id=zone_id_for(city, domain),
        city=city,
        domain=domain,
        score=score,
        confidence=confidence_for(len(raw)),
        coordinates=zone_coordinates(city, domain, area),
        signal_count=len(signals),
        deduplicated_count=len(deduped),
        distinct_source_types=len(raw),
        contributions=breakdown,
        signal_ids=tuple(signal.signal_id for signal in deduped),
    )


def build_zones(
    signals: Iterable[NormalizedSignal],
    now: datetime,
    min_score: float = 0.0,
) -> tuple[Zone, ...]:
    """Group signals into (city, domain) zones and score each one.

    Args:
        signals: All normalized signals in scope.
        now: Injected clock — the decay term makes this the single input that
            changes every score, so it is never read from inside.
        min_score: Drop zones below this score, for map decluttering.

    Returns:
        Zones sorted by score descending, then zone id, so ordering is stable.
    """
    bins: dict[tuple[str, str], list[NormalizedSignal]] = defaultdict(list)
    for signal in signals:
        bins[(signal.city, signal.domain)].append(signal)

    zones = [build_zone(city, domain, grouped, now) for (city, domain), grouped in bins.items()]
    return tuple(
        sorted(
            (zone for zone in zones if zone.score >= min_score),
            key=lambda zone: (-zone.score, zone.zone_id),
        )
    )


def max_source_share(score: float, breakdown: Sequence[SourceContribution]) -> float:
    """Largest single-source share of a final score, for the cap invariant test.

    Expect `<= SOURCE_CAP_RATIO` for any zone with two or more source types. A
    single-source zone returns 1.0 by definition — the cap has no solution there,
    which is why that case is clamped and marked LOW confidence instead.
    """
    if score <= 0.0 or not breakdown:
        return 0.0
    return max(contribution.capped for contribution in breakdown) / score
