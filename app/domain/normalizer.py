"""Raw collector rows to canonical signals.

Collector output is best-effort: fields are omitted rather than nulled, cities
arrive as venue strings, and a technology domain is rarely labelled. This module
does the mapping, and rejects anything it cannot map with confidence.

Rejection is a first-class result, not an exception: `NormalizationOutcome`
carries both the survivors and the reasons, so the API can report "6 of 8 records
usable" instead of quietly under-reporting.
"""

import hashlib
import re
from collections.abc import Iterable, Mapping
from datetime import datetime

from app.domain.dates import parse_signal_date
from app.domain.enums import SignalType, SourceType
from app.domain.geo import resolve_location
from app.domain.models import (
    NormalizationOutcome,
    NormalizedSignal,
    RawRecord,
)

REQUIRED_FIELDS: tuple[str, ...] = ("title", "date", "city", "domain")

# Field aliases, because a collector prompt cannot guarantee key names across four
# very different site layouts. First present key wins.
_FIELD_ALIASES: Mapping[str, tuple[str, ...]] = {
    "title": ("title", "headline", "name", "event_title", "announcement_title", "project_title"),
    "date": ("date", "published_at", "publication_date", "event_date", "grant_date", "url"),
    "city": ("city", "location", "venue", "place", "target_city", "locality"),
    "domain": ("domain", "technology", "topic", "field", "department", "technology_domain"),
    "summary": ("summary", "description", "excerpt", "abstract", "body"),
    "source_url": ("source_url", "url", "link", "permalink"),
}

# Technology domain taxonomy. Ordered longest-phrase-first at match time so
# "machine learning" is not shadowed by a bare "learning".
_DOMAIN_KEYWORDS: Mapping[str, tuple[str, ...]] = {
    "AI/ML": (
        "artificial intelligence",
        "machine learning",
        "deep learning",
        "generative ai",
        "ai/ml",
        "aiml",
        "llm",
        "agentic ai",
        "neural network",
        " ai ",
        "nlp",
    ),
    "IoT": ("internet of things", "iot", "edge computing", "embedded systems", "sensor network"),
    "Robotics": ("robotics", "robot", "autonomous vehicle", "drone", "uav"),
    "Biotech": (
        "biotech",
        "genomics",
        "crispr",
        "gene editing",
        "life sciences",
        "drug discovery",
        "bioinformatics",
        "vaccine",
    ),
    "Climate & Energy": (
        "climate",
        "renewable",
        "solar",
        "battery",
        "clean energy",
        "sustainability",
        "carbon",
        "electric vehicle",
        "hydrogen",
    ),
    "Semiconductors": (
        "semiconductor",
        "chip design",
        "fabrication",
        "vlsi",
        "photonics",
        "foundry",
    ),
    "Fintech": ("fintech", "payments", "digital banking", "blockchain", "tokenization"),
    "Cybersecurity": ("cybersecurity", "security research", "cryptography", "zero trust"),
    "Quantum": ("quantum computing", "quantum", "qubit"),
    "Space": ("space tech", "satellite", "launch vehicle", "aerospace"),
}

# Signal type detection. Facility and grant signals are the valuable ones; a plain
# event is the fallback, matching the weight table in `convergence`.
_FACILITY_MARKERS: tuple[str, ...] = (
    "opens",
    "opening",
    "new center",
    "new centre",
    "new lab",
    "laboratory",
    "facility",
    "campus",
    "expansion",
    "expands",
    "r&d center",
    "r&d centre",
    "office",
    "headquarters",
    "manufacturing",
)
_GRANT_MARKERS: tuple[str, ...] = (
    "grant",
    "funding",
    "funded",
    "raises",
    "investment",
    "partnership",
    "mou",
    "collaboration",
    "fellowship",
    "award",
    "seed round",
    "series a",
)

_SLUG = re.compile(r"[^a-z0-9]+")
_WHITESPACE = re.compile(r"\s+")
_MIN_TITLE_LENGTH = 8


def slugify(text: str) -> str:
    """Lowercase hyphenated slug, used for zone ids and signal ids."""
    return _SLUG.sub("-", text.casefold()).strip("-")


def _first_present(record: RawRecord, logical: str) -> str | None:
    """Return the first populated alias for a logical field."""
    for key in _FIELD_ALIASES[logical]:
        if record.has(key):
            return str(record.value(key)).strip()
    return None


def _clean(text: str) -> str:
    return _WHITESPACE.sub(" ", text).strip()


def classify_domain(*texts: str | None) -> str | None:
    """Infer the technology domain from any available free text.

    Returns None when nothing matches — better an unscored record than a signal
    filed under the wrong domain, which would corrupt a zone's convergence claim.
    """
    haystack = " ".join(f" {t.casefold()} " for t in texts if t)
    if not haystack.strip():
        return None
    for domain in _DOMAIN_KEYWORDS:
        if f" {domain.casefold()} " in haystack or domain.casefold() == haystack.strip():
            return domain
    best: tuple[int, str] | None = None
    for domain, keywords in _DOMAIN_KEYWORDS.items():
        for keyword in keywords:
            if keyword in haystack and (best is None or len(keyword) > best[0]):
                best = (len(keyword), domain)
    return best[1] if best else None


def classify_signal_type(source_type: SourceType, *texts: str | None) -> SignalType:
    """Infer what kind of event a signal describes.

    Tech-event collectors are pinned to `TECH_EVENT` regardless of wording: an
    event listing that happens to mention "funding" is still an event, and letting
    it claim facility weight would inflate scores on the cheapest signal source.
    """
    if source_type is SourceType.TECH_EVENT:
        return SignalType.TECH_EVENT

    haystack = " ".join(f" {t.casefold()} " for t in texts if t)
    if any(marker in haystack for marker in _FACILITY_MARKERS):
        return SignalType.FACILITY_EXPANSION
    if any(marker in haystack for marker in _GRANT_MARKERS):
        return SignalType.RESEARCH_GRANT
    return SignalType.TECH_EVENT


def build_signal_id(city: str, domain: str, source_url: str, title: str) -> str:
    """Deterministic identifier, so re-running a collector upserts instead of duplicating.

    Derived from the source URL and title rather than a random UUID: the same
    article scraped twice must collapse to one row, which is what makes the
    "run it again after healing" demo step idempotent.
    """
    digest = hashlib.sha256(f"{source_url}|{title.casefold()}".encode()).hexdigest()[:10]
    return f"sig_{slugify(city)}_{slugify(domain)}_{digest}"


def normalize_record(
    record: RawRecord,
    source_type: SourceType,
    now: datetime,
    city_hint: str | None = None,
) -> NormalizedSignal | str:
    """Normalize one row.

    Args:
        record: The raw collector row.
        source_type: Which locked category this collector belongs to.
        now: Injected clock, used for year inference on bare day/month dates.
        city_hint: The collector's expected city, used only when the row itself
            names no location. A hint never overrides an explicit one — that is
            how off-target rows (Eventbrite returning Hong Kong under an SF
            filter) get caught instead of relabelled.

    Returns:
        A `NormalizedSignal`, or a short reason string explaining the rejection.
    """
    title = _first_present(record, "title")
    if not title or len(_clean(title)) < _MIN_TITLE_LENGTH:
        return "missing or too-short title"

    title = _clean(title)
    summary = _clean(_first_present(record, "summary") or title)
    source_url = _first_present(record, "source_url") or record.source_url
    if not source_url:
        return "missing source url"

    signal_date = parse_signal_date(_first_present(record, "date"), now)
    if signal_date is None:
        signal_date = parse_signal_date(source_url, now)
    if signal_date is None:
        return "unparseable date"

    location_text = _first_present(record, "city")
    resolved = resolve_location(location_text)
    if resolved is None and location_text is None:
        # The hint applies only to rows that name no location at all. Falling back
        # whenever resolution *fails* would relabel an off-target row (Eventbrite
        # returning Hong Kong under an SF filter) as the hinted city.
        resolved = resolve_location(city_hint)
    if resolved is None:
        return f"location outside supported cities: {location_text or 'unknown'!r}"

    domain = _first_present(record, "domain")
    canonical_domain = classify_domain(domain, title, summary)
    if canonical_domain is None:
        return "no recognisable technology domain"

    city = resolved.city.value
    return NormalizedSignal(
        signal_id=build_signal_id(city, canonical_domain, source_url, title),
        collector_key=record.collector_key,
        source_type=source_type,
        source_url=source_url,
        title=title,
        date=signal_date,
        city=city,
        domain=canonical_domain,
        signal_type=classify_signal_type(source_type, title, summary),
        summary=summary,
        extracted_at=now,
        area=resolved.area,
        evidence_urls=(source_url,),
    )


def normalize_batch(
    records: Iterable[RawRecord],
    source_type: SourceType,
    now: datetime,
    city_hint: str | None = None,
) -> NormalizationOutcome:
    """Normalize a whole run, keeping survivors and rejection reasons together."""
    signals: list[NormalizedSignal] = []
    rejections: list[tuple[int, str]] = []
    for index, record in enumerate(records):
        result = normalize_record(record, source_type, now, city_hint)
        if isinstance(result, str):
            rejections.append((index, result))
        else:
            signals.append(result)
    return NormalizationOutcome(signals=tuple(signals), rejections=tuple(rejections))
