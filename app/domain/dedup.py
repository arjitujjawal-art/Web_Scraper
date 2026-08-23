"""Collapse multiple reports of one real-world event into a single signal.

This is the safeguard that makes the emergence score defensible. Without it, one
lab opening covered by three outlets reads as three independent signals and the
city/domain score triples — the exact false-positive the score is supposed to
avoid.

Duplicates are **merged, not discarded**: the survivor keeps the earliest date and
accumulates every source URL. That is what lets the UI say "3 outlets reported
this, counted once" instead of silently throwing evidence away.
"""

import re
from collections.abc import Iterable, Sequence
from datetime import timedelta
from difflib import SequenceMatcher

from app.domain.enums import SignalType
from app.domain.models import NormalizedSignal

DEFAULT_SIMILARITY_THRESHOLD = 0.85
DEFAULT_WINDOW_DAYS = 3

# Ranked by evidential strength, mirroring the weight table in `convergence`.
# When two reports of one event disagree, the stronger classification wins.
_TYPE_RANK: dict[SignalType, int] = {
    SignalType.FACILITY_EXPANSION: 3,
    SignalType.RESEARCH_GRANT: 2,
    SignalType.TECH_EVENT: 1,
}

_NOISE = re.compile(r"[^a-z0-9 ]+")
_SPACES = re.compile(r"\s+")

# Words that appear in most headlines and dilute the similarity ratio.
_STOPWORDS = frozenset(
    {"a", "an", "the", "in", "of", "to", "for", "on", "at", "and", "new", "with", "its"}
)


def comparable_title(title: str) -> str:
    """Reduce a headline to its distinctive words for similarity comparison.

    "Enterprise IoT Corp Opens a New R&D Center in Delhi" and
    "Enterprise IoT Corp opens new R&D centre in Delhi" should score as the same
    story; punctuation and filler words are what stop them from doing so.
    """
    stripped = _NOISE.sub(" ", title.casefold())
    words = [w for w in _SPACES.split(stripped) if w and w not in _STOPWORDS]
    return " ".join(words)


def title_similarity(left: str, right: str) -> float:
    """Similarity of two headlines in [0.0, 1.0].

    `SequenceMatcher` is chosen over embeddings deliberately: no model to download,
    no API call, deterministic in tests, and at the scale of one city/domain bin
    the quality difference does not change the outcome.
    """
    return SequenceMatcher(None, comparable_title(left), comparable_title(right)).ratio()


def _is_duplicate(
    left: NormalizedSignal,
    right: NormalizedSignal,
    similarity_threshold: float,
    window: timedelta,
) -> bool:
    """Whether two signals describe the same event.

    All three conditions must hold: same bin, publication dates close together,
    and near-identical titles. The date window is what stops an annual event from
    merging with last year's edition.
    """
    if (left.city, left.domain) != (right.city, right.domain):
        return False
    if abs(left.date - right.date) > window:
        return False
    return title_similarity(left.title, right.title) >= similarity_threshold


def _merge(primary: NormalizedSignal, duplicate: NormalizedSignal) -> NormalizedSignal:
    """Fold a duplicate into the signal already kept.

    The earliest date wins, because being first to report is what the decay model
    is measuring. Evidence URLs accumulate in first-seen order, deduplicated.
    """
    earliest, latest = sorted((primary, duplicate), key=lambda s: s.date)

    merged_urls: dict[str, None] = {}
    for url in (*primary.evidence_urls, *duplicate.evidence_urls):
        merged_urls.setdefault(url, None)

    stronger = max(primary.signal_type, duplicate.signal_type, key=lambda t: _TYPE_RANK[t])
    longer_summary = max(primary.summary, duplicate.summary, key=len)

    return NormalizedSignal(
        signal_id=primary.signal_id,
        collector_key=primary.collector_key,
        source_type=primary.source_type,
        source_url=primary.source_url,
        title=primary.title,
        date=earliest.date,
        city=primary.city,
        domain=primary.domain,
        signal_type=stronger,
        summary=longer_summary,
        extracted_at=max(primary.extracted_at, duplicate.extracted_at),
        area=primary.area or duplicate.area or latest.area,
        evidence_urls=tuple(merged_urls),
    )


def deduplicate(
    signals: Iterable[NormalizedSignal],
    similarity_threshold: float = DEFAULT_SIMILARITY_THRESHOLD,
    window_days: int = DEFAULT_WINDOW_DAYS,
) -> tuple[NormalizedSignal, ...]:
    """Merge near-identical signals within each (city, domain) bin.

    Processing oldest-first means the earliest report becomes the survivor, so the
    merged signal is anchored to when the news actually broke.

    Args:
        signals: Normalized signals, in any order.
        similarity_threshold: Minimum title similarity to treat as the same event.
        window_days: Maximum publication-date gap between duplicates.

    Returns:
        Deduplicated signals, oldest first. Order is deterministic, which keeps
        the score reproducible for a judge re-running the pipeline.
    """
    window = timedelta(days=window_days)
    kept: list[NormalizedSignal] = []

    for signal in sorted(signals, key=lambda s: (s.date, s.signal_id)):
        for index, existing in enumerate(kept):
            if _is_duplicate(existing, signal, similarity_threshold, window):
                kept[index] = _merge(existing, signal)
                break
        else:
            kept.append(signal)

    return tuple(kept)


def duplicate_groups(
    signals: Sequence[NormalizedSignal],
    similarity_threshold: float = DEFAULT_SIMILARITY_THRESHOLD,
    window_days: int = DEFAULT_WINDOW_DAYS,
) -> tuple[tuple[NormalizedSignal, ...], ...]:
    """Group signals by underlying event without merging them.

    Useful for the "why was this flagged" panel and for debugging a suspicious
    score: it shows which records the scorer treated as one.
    """
    window = timedelta(days=window_days)
    groups: list[list[NormalizedSignal]] = []

    for signal in sorted(signals, key=lambda s: (s.date, s.signal_id)):
        for group in groups:
            if _is_duplicate(group[0], signal, similarity_threshold, window):
                group.append(signal)
                break
        else:
            groups.append([signal])

    return tuple(tuple(group) for group in groups)
