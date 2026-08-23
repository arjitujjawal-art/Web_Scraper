"""Normalization: the boundary where best-effort scraper output becomes data.

The bar is deliberately high — a record that cannot be located, dated and
classified with confidence is rejected with a reason, because a mislocated or
misdated signal corrupts a zone's convergence claim rather than merely weakening it.
"""

from datetime import UTC, datetime

import pytest
from app.domain.enums import SignalType, SourceType
from app.domain.models import RawRecord
from app.domain.normalizer import (
    REQUIRED_FIELDS,
    build_signal_id,
    classify_domain,
    classify_signal_type,
    normalize_batch,
    normalize_record,
    slugify,
)

NOW = datetime(2026, 8, 22, 12, 0, tzinfo=UTC)

COMPLETE_ROW = {
    "title": "Enterprise IoT Corp opens R&D centre in Gurugram",
    "date": "2026-08-14",
    "city": "Gurugram, Delhi NCR",
    "domain": "Internet of things",
    "summary": "A 400-seat centre focused on industrial sensor networks.",
    "url": "https://newsroom.test/iot-gurugram",
}


def record(overrides: dict[str, object] | None = None) -> RawRecord:
    """A raw row that normalizes cleanly, with the given fields overridden."""
    return RawRecord(fields={**COMPLETE_ROW, **(overrides or {})}, collector_key="demo_newsroom")


def normalize(overrides: dict[str, object] | None = None, city_hint: str | None = None):
    """Normalize one overridden row as a startup-newsroom record."""
    return normalize_record(record(overrides), SourceType.STARTUP_NEWSROOM, NOW, city_hint)


class TestSlugify:
    @pytest.mark.parametrize(
        ("text", "expected"),
        [
            ("Delhi", "delhi"),
            ("San Francisco", "san-francisco"),
            ("AI/ML", "ai-ml"),
            ("Climate & Energy", "climate-energy"),
        ],
    )
    def test_slugs_are_lowercase_and_hyphenated(self, text, expected):
        assert slugify(text) == expected


class TestClassifyDomain:
    @pytest.mark.parametrize(
        ("text", "expected"),
        [
            ("Internet of things", "IoT"),
            ("edge computing platform", "IoT"),
            ("Artificial Intelligence", "AI/ML"),
            ("machine learning research", "AI/ML"),
            ("Robotics", "Robotics"),
            ("quantum computing", "Quantum"),
            ("semiconductor fabrication", "Semiconductors"),
            ("clean energy storage", "Climate & Energy"),
        ],
    )
    def test_keywords_map_to_the_canonical_taxonomy(self, text, expected):
        assert classify_domain(text) == expected

    def test_the_longest_matching_phrase_wins(self):
        # "quantum computing" must not be shadowed by a bare "quantum".
        assert classify_domain("quantum computing hardware") == "Quantum"
        assert classify_domain("machine learning on edge") == "AI/ML"

    def test_unrecognised_text_returns_none(self):
        assert classify_domain("A profile of the founding team") is None

    def test_no_text_at_all_returns_none(self):
        assert classify_domain(None, "", "   ") is None


class TestClassifySignalType:
    def test_a_new_facility_is_the_strongest_classification(self):
        classified = classify_signal_type(
            SourceType.STARTUP_NEWSROOM, "Corp opens new R&D centre in Noida"
        )

        assert classified is SignalType.FACILITY_EXPANSION

    def test_a_grant_is_recognised(self):
        classified = classify_signal_type(
            SourceType.UNIVERSITY_RESEARCH, "Lab wins climate modelling grant"
        )

        assert classified is SignalType.RESEARCH_GRANT

    def test_an_event_collector_is_pinned_to_event_regardless_of_wording(self):
        # An event listing that mentions "funding" is still an event; letting it
        # claim facility weight would inflate scores on the cheapest source.
        classified = classify_signal_type(
            SourceType.TECH_EVENT, "Startup funding summit opens new campus track"
        )

        assert classified is SignalType.TECH_EVENT

    def test_an_unclassifiable_headline_falls_back_to_event(self):
        classified = classify_signal_type(SourceType.STARTUP_NEWSROOM, "A quiet week in Delhi")

        assert classified is SignalType.TECH_EVENT


class TestBuildSignalId:
    def test_ids_are_deterministic(self):
        first = build_signal_id("Delhi", "IoT", "https://a.test/x", "Title")
        second = build_signal_id("Delhi", "IoT", "https://a.test/x", "Title")

        assert first == second
        assert first.startswith("sig_delhi_iot_")

    def test_case_differences_in_the_title_do_not_split_a_signal(self):
        lower = build_signal_id("Delhi", "IoT", "https://a.test/x", "opens centre")
        upper = build_signal_id("Delhi", "IoT", "https://a.test/x", "Opens Centre")

        assert lower == upper

    def test_a_different_url_is_a_different_signal(self):
        first = build_signal_id("Delhi", "IoT", "https://a.test/x", "Title")
        second = build_signal_id("Delhi", "IoT", "https://a.test/y", "Title")

        assert first != second


class TestNormalizeRecord:
    def test_a_complete_row_becomes_a_signal(self):
        signal = normalize()

        assert not isinstance(signal, str)
        assert signal.title == COMPLETE_ROW["title"]
        assert signal.city == "Delhi"
        assert signal.area == "Gurugram"
        assert signal.domain == "IoT"
        assert signal.signal_type is SignalType.FACILITY_EXPANSION
        assert signal.date == datetime(2026, 8, 14, tzinfo=UTC)
        assert signal.extracted_at == NOW
        assert signal.source_url == "https://newsroom.test/iot-gurugram"
        assert signal.evidence_urls == ("https://newsroom.test/iot-gurugram",)

    def test_the_required_field_list_is_what_the_report_measures(self):
        assert REQUIRED_FIELDS == ("title", "date", "city", "domain")

    def test_a_missing_title_is_rejected(self):
        assert normalize({"title": None}) == "missing or too-short title"

    def test_a_too_short_title_is_rejected(self):
        assert normalize({"title": "IoT"}) == "missing or too-short title"

    def test_a_missing_source_url_is_rejected(self):
        assert normalize({"url": None}) == "missing source url"

    def test_an_unparseable_date_is_rejected_not_defaulted(self):
        assert normalize({"date": "coming soon"}) == "unparseable date"

    def test_a_location_outside_the_supported_cities_is_rejected(self):
        # Eventbrite returns Hong Kong listings under a San Francisco filter.
        rejection = normalize({"city": "Hong Kong"})

        assert isinstance(rejection, str)
        assert rejection.startswith("location outside supported cities")

    def test_a_row_with_no_recognisable_domain_is_rejected(self):
        rejection = normalize(
            {
                "title": "A profile of the founding team",
                "domain": None,
                "summary": "An interview about company culture.",
            }
        )

        assert rejection == "no recognisable technology domain"

    def test_the_city_hint_fills_in_only_when_the_row_names_no_location(self):
        signal = normalize({"city": None}, city_hint="Noida")

        assert not isinstance(signal, str)
        assert signal.city == "Delhi"
        assert signal.area == "Noida"

    def test_the_city_hint_never_overrides_an_explicit_off_target_location(self):
        rejection = normalize({"city": "Hong Kong"}, city_hint="Delhi")

        assert isinstance(rejection, str)
        assert rejection.startswith("location outside supported cities")

    def test_the_date_falls_back_to_the_url_path(self):
        # Berkeley prints no date line; the date is only in the article URL.
        signal = normalize(
            {"date": None, "url": "https://news.berkeley.edu/2026/08/21/quantum-grant/"}
        )

        assert not isinstance(signal, str)
        assert signal.date == datetime(2026, 8, 21, tzinfo=UTC)

    def test_a_whitespace_only_value_counts_as_missing(self):
        assert normalize({"title": "   "}) == "missing or too-short title"

    def test_the_record_level_source_url_is_used_when_no_field_carries_one(self):
        raw = RawRecord(
            fields={key: value for key, value in COMPLETE_ROW.items() if key != "url"},
            collector_key="demo_newsroom",
            source_url="https://newsroom.test/fallback",
        )

        signal = normalize_record(raw, SourceType.STARTUP_NEWSROOM, NOW)

        assert not isinstance(signal, str)
        assert signal.source_url == "https://newsroom.test/fallback"


class TestNormalizeBatch:
    def test_survivors_and_rejections_are_reported_together(self):
        records = [
            record(),
            record({"title": "IoT"}),
            record({"city": "Hong Kong"}),
            record({"url": "https://newsroom.test/second", "title": "Robotics lab opens in Okhla"}),
        ]

        outcome = normalize_batch(records, SourceType.STARTUP_NEWSROOM, NOW)

        assert len(outcome.signals) == 2
        assert outcome.rejected_count == 2
        assert outcome.rejections[0][0] == 1
        assert "missing or too-short title" in outcome.reasons()

    def test_reasons_are_distinct_and_in_first_seen_order(self):
        records = [record({"title": "IoT"}), record({"title": "AI"}), record({"date": "soon"})]

        outcome = normalize_batch(records, SourceType.STARTUP_NEWSROOM, NOW)

        assert outcome.reasons() == ("missing or too-short title", "unparseable date")

    def test_the_mutated_layout_rejects_every_row(self):
        # This is what the healing demo's second run produces: the title selector no
        # longer matches, so no row survives normalization even though six arrived.
        rows = [record({"title": None, "city": None}) for _ in range(6)]

        outcome = normalize_batch(rows, SourceType.STARTUP_NEWSROOM, NOW)

        assert outcome.signals == ()
        assert outcome.rejected_count == 6
        assert outcome.reasons() == ("missing or too-short title",)
