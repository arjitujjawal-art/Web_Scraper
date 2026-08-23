"""Deduplication is what keeps the emergence score defensible.

One lab opening covered by three outlets must count once — and must still show all
three URLs as evidence, because "3 outlets reported this, counted once" is the
claim the UI makes.
"""

from datetime import UTC, datetime, timedelta

from app.domain.dedup import (
    comparable_title,
    deduplicate,
    duplicate_groups,
    title_similarity,
)
from app.domain.enums import SignalType, SourceType
from app.domain.models import NormalizedSignal

NOW = datetime(2026, 8, 22, 12, 0, tzinfo=UTC)

# The same event as filed by three different outlets: punctuation, casing and
# filler words differ, the story does not.
OUTLET_HEADLINES = (
    "Enterprise IoT Corp Opens a New R&D Center in Gurugram",
    "Enterprise IoT Corp opens new R&D centre in Gurugram",
    "Enterprise IoT Corp. opens new R&D center in Gurugram!",
)


def signal(
    signal_id: str,
    title: str,
    *,
    days_ago: int = 0,
    city: str = "Delhi",
    domain: str = "IoT",
    signal_type: SignalType = SignalType.FACILITY_EXPANSION,
    summary: str = "short summary",
) -> NormalizedSignal:
    """A signal carrying only the fields deduplication looks at."""
    source_url = f"https://outlet.test/{signal_id}"
    return NormalizedSignal(
        signal_id=signal_id,
        collector_key="startup_news_delhi",
        source_type=SourceType.STARTUP_NEWSROOM,
        source_url=source_url,
        title=title,
        date=NOW - timedelta(days=days_ago),
        city=city,
        domain=domain,
        signal_type=signal_type,
        summary=summary,
        extracted_at=NOW,
        evidence_urls=(source_url,),
    )


class TestComparableTitle:
    def test_punctuation_and_filler_words_are_dropped(self):
        assert comparable_title("Opens a New R&D Center in Delhi!") == "opens r d center delhi"

    def test_three_outlets_clear_the_similarity_threshold(self):
        first, second, third = OUTLET_HEADLINES
        assert title_similarity(first, second) >= 0.85
        assert title_similarity(first, third) >= 0.85

    def test_unrelated_headlines_do_not(self):
        left = "Quantum startup raises seed round"
        right = "Robotics meetup in Noida"
        assert title_similarity(left, right) < 0.85


class TestDeduplicate:
    def test_three_outlets_collapse_to_one_signal_with_three_evidence_urls(self):
        signals = [
            signal("sig_a", OUTLET_HEADLINES[0], days_ago=2),
            signal("sig_b", OUTLET_HEADLINES[1], days_ago=1),
            signal("sig_c", OUTLET_HEADLINES[2], days_ago=0),
        ]

        deduped = deduplicate(signals)

        assert len(deduped) == 1
        survivor = deduped[0]
        assert survivor.evidence_count == 3
        assert set(survivor.evidence_urls) == {
            "https://outlet.test/sig_a",
            "https://outlet.test/sig_b",
            "https://outlet.test/sig_c",
        }

    def test_the_earliest_report_anchors_the_merged_signal(self):
        signals = [
            signal("sig_late", OUTLET_HEADLINES[1], days_ago=0),
            signal("sig_first", OUTLET_HEADLINES[0], days_ago=2),
        ]

        (survivor,) = deduplicate(signals)

        assert survivor.signal_id == "sig_first"
        assert survivor.date == NOW - timedelta(days=2)

    def test_reports_outside_the_window_stay_separate(self):
        # An annual event must not merge with last year's edition.
        signals = [
            signal("sig_2025", OUTLET_HEADLINES[0], days_ago=0),
            signal("sig_2026", OUTLET_HEADLINES[1], days_ago=8),
        ]

        assert len(deduplicate(signals)) == 2

    def test_same_headline_in_a_different_bin_stays_separate(self):
        signals = [
            signal("sig_delhi", OUTLET_HEADLINES[0]),
            signal("sig_sf", OUTLET_HEADLINES[0], city="San Francisco"),
            signal("sig_other_domain", OUTLET_HEADLINES[0], domain="AI/ML"),
        ]

        assert len(deduplicate(signals)) == 3

    def test_the_stronger_classification_wins_a_merge(self):
        signals = [
            signal("sig_weak", OUTLET_HEADLINES[0], days_ago=2, signal_type=SignalType.TECH_EVENT),
            signal(
                "sig_strong",
                OUTLET_HEADLINES[1],
                days_ago=1,
                signal_type=SignalType.FACILITY_EXPANSION,
            ),
        ]

        (survivor,) = deduplicate(signals)

        assert survivor.signal_type is SignalType.FACILITY_EXPANSION

    def test_the_longer_summary_survives(self):
        signals = [
            signal("sig_terse", OUTLET_HEADLINES[0], days_ago=2, summary="Opened."),
            signal(
                "sig_detailed",
                OUTLET_HEADLINES[1],
                days_ago=1,
                summary="A 400-seat research centre focused on industrial sensor networks.",
            ),
        ]

        (survivor,) = deduplicate(signals)

        assert survivor.summary.startswith("A 400-seat")

    def test_output_is_ordered_oldest_first_and_deterministic(self):
        signals = [
            signal("sig_c", "Robotics fellowship opens at Okhla campus", days_ago=1),
            signal("sig_a", "Quantum lab opens in Noida", days_ago=5),
            signal("sig_b", "Battery plant announced for Faridabad", days_ago=3),
        ]

        ids = [s.signal_id for s in deduplicate(signals)]

        assert ids == ["sig_a", "sig_b", "sig_c"]
        assert ids == [s.signal_id for s in deduplicate(list(reversed(signals)))]

    def test_empty_input(self):
        assert deduplicate([]) == ()

    def test_a_lone_signal_reports_one_piece_of_evidence(self):
        (only,) = deduplicate([signal("sig_a", OUTLET_HEADLINES[0])])

        assert only.evidence_count == 1


class TestDuplicateGroups:
    def test_grouping_shows_which_records_were_treated_as_one(self):
        signals = [
            signal("sig_a", OUTLET_HEADLINES[0], days_ago=2),
            signal("sig_b", OUTLET_HEADLINES[1], days_ago=1),
            signal("sig_c", OUTLET_HEADLINES[2], days_ago=0),
            signal("sig_unrelated", "Battery plant announced for Faridabad", days_ago=1),
        ]

        groups = duplicate_groups(signals)

        assert [len(group) for group in groups] == [3, 1]
        assert groups[0][0].signal_id == "sig_a"
