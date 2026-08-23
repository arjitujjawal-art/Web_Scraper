"""The emergence score: decay, the source-concentration cap, and zone assembly.

The cap is the part worth testing hardest. The obvious implementation — clip the
dominant contribution to `total * 0.6` — does not satisfy its own rule, so these
tests assert the *invariant* (no source type exceeds 60% of the final score) rather
than the arithmetic that happens to produce it.
"""

import math
import random
from datetime import UTC, datetime, timedelta

import pytest
from app.domain.convergence import (
    SOURCE_CAP_RATIO,
    TIME_DECAY_LAMBDA,
    WEIGHTS,
    apply_source_cap,
    build_zone,
    build_zones,
    confidence_for,
    max_source_share,
    raw_contributions_by_source,
    score_signals,
    signal_contribution,
    zone_id_for,
)
from app.domain.enums import Confidence, SignalType, SourceType
from app.domain.models import NormalizedSignal

NOW = datetime(2026, 8, 22, 12, 0, tzinfo=UTC)

# Scoring runs deduplication first, so a helper that gave every signal the same
# stock headline would silently collapse three signals into one and every count in
# these tests would be wrong. Each id maps deterministically to a different
# headline instead.
_HEADLINES = (
    "Quantum lab opens in Noida",
    "Battery plant announced for Faridabad",
    "Robotics fellowship at Okhla campus",
    "Semiconductor design office in Santa Clara",
    "Climate modelling grant for Berkeley",
    "Drone testing range near Dwarka",
    "Genomics facility opens in Gurugram",
    "Payments infrastructure hub in SoMa",
    "Zero trust security centre in Oakland",
    "Satellite ground station near Ghaziabad",
)


def _headline_for(signal_id: str) -> str:
    """A stable, distinct headline per signal id."""
    return _HEADLINES[sum(ord(char) for char in signal_id) % len(_HEADLINES)]


def signal(
    signal_id: str,
    *,
    source_type: SourceType = SourceType.STARTUP_NEWSROOM,
    signal_type: SignalType = SignalType.FACILITY_EXPANSION,
    days_ago: int = 0,
    city: str = "Delhi",
    domain: str = "AI/ML",
    title: str | None = None,
    area: str | None = None,
) -> NormalizedSignal:
    """A signal carrying only the fields scoring looks at."""
    return NormalizedSignal(
        signal_id=signal_id,
        collector_key="test_collector",
        source_type=source_type,
        source_url=f"https://outlet.test/{signal_id}",
        title=title or _headline_for(signal_id),
        date=NOW - timedelta(days=days_ago),
        city=city,
        domain=domain,
        signal_type=signal_type,
        summary=f"summary {signal_id}",
        extracted_at=NOW,
        area=area,
        evidence_urls=(f"https://outlet.test/{signal_id}",),
    )


class TestSignalContribution:
    def test_a_brand_new_signal_contributes_its_full_weight(self):
        contribution = signal_contribution(signal("sig_a", days_ago=0), NOW)

        assert contribution == pytest.approx(WEIGHTS[SignalType.FACILITY_EXPANSION])

    def test_decay_matches_the_documented_formula(self):
        expected = 3.0 * math.exp(-TIME_DECAY_LAMBDA * 10)

        assert signal_contribution(signal("sig_a", days_ago=10), NOW) == pytest.approx(expected)

    def test_contribution_is_monotonically_decreasing_in_age(self):
        ages = [0, 1, 5, 10, 30, 90]
        values = [signal_contribution(signal(f"sig_{age}", days_ago=age), NOW) for age in ages]

        assert values == sorted(values, reverse=True)

    def test_a_thirty_day_old_signal_has_lost_most_of_its_weight(self):
        fresh = signal_contribution(signal("sig_new", days_ago=0), NOW)
        stale = signal_contribution(signal("sig_old", days_ago=30), NOW)

        assert stale / fresh == pytest.approx(math.exp(-3.0), rel=1e-6)

    def test_event_weight_is_the_weakest(self):
        assert WEIGHTS[SignalType.TECH_EVENT] < WEIGHTS[SignalType.RESEARCH_GRANT]
        assert WEIGHTS[SignalType.RESEARCH_GRANT] < WEIGHTS[SignalType.FACILITY_EXPANSION]


class TestApplySourceCap:
    def test_the_reviewed_counterexample_now_satisfies_the_rule(self):
        # Contributions 80/20. Clipping to `total * 0.6` would return 80 with the
        # dominant source at 75% — above the ceiling it claims to enforce.
        raw = {SourceType.STARTUP_NEWSROOM: 80.0, SourceType.TECH_EVENT: 20.0}

        score, breakdown = apply_source_cap(raw)

        assert score == pytest.approx(50.0)
        assert max_source_share(score, breakdown) == pytest.approx(SOURCE_CAP_RATIO)

    def test_an_already_compliant_mix_is_left_untouched(self):
        raw = {SourceType.STARTUP_NEWSROOM: 50.0, SourceType.TECH_EVENT: 50.0}

        score, breakdown = apply_source_cap(raw)

        assert score == pytest.approx(100.0)
        assert max_source_share(score, breakdown) == pytest.approx(0.5)

    def test_the_breakdown_sums_to_the_final_score(self):
        raw = {
            SourceType.STARTUP_NEWSROOM: 9.0,
            SourceType.UNIVERSITY_RESEARCH: 3.0,
            SourceType.TECH_EVENT: 1.0,
        }

        score, breakdown = apply_source_cap(raw)

        assert sum(part.capped for part in breakdown) == pytest.approx(score)

    def test_only_the_dominant_source_is_marked_as_capped(self):
        raw = {SourceType.STARTUP_NEWSROOM: 80.0, SourceType.TECH_EVENT: 20.0}

        _, breakdown = apply_source_cap(raw)

        assert breakdown[0].source_type is SourceType.STARTUP_NEWSROOM
        assert breakdown[0].was_capped
        assert not breakdown[1].was_capped

    def test_a_single_source_zone_is_clamped_rather_than_dividing_by_zero(self):
        score, breakdown = apply_source_cap({SourceType.STARTUP_NEWSROOM: 10.0})

        assert score == pytest.approx(10.0 * SOURCE_CAP_RATIO)
        assert len(breakdown) == 1
        assert breakdown[0].was_capped

    def test_no_contributions_scores_zero(self):
        assert apply_source_cap({}) == (0.0, ())

    def test_zero_contributions_score_zero(self):
        assert apply_source_cap({SourceType.TECH_EVENT: 0.0}) == (0.0, ())

    @pytest.mark.parametrize("cap_ratio", [0.0, 1.0, -0.5, 1.5])
    def test_an_impossible_cap_ratio_is_refused(self, cap_ratio):
        with pytest.raises(ValueError, match="cap_ratio"):
            apply_source_cap({SourceType.TECH_EVENT: 1.0}, cap_ratio=cap_ratio)

    def test_the_invariant_holds_over_randomised_mixes(self):
        # Scoped to mixes with two or more source types: a single-source zone has no
        # solution under the cap, which is why it is clamped and marked LOW instead.
        rng = random.Random(20260822)  # noqa: S311 — test data, not cryptography
        sources = list(SourceType)

        for _ in range(500):
            chosen = rng.sample(sources, rng.randint(2, len(sources)))
            raw = {source: rng.uniform(0.01, 100.0) for source in chosen}

            score, breakdown = apply_source_cap(raw)

            assert score > 0.0
            assert score <= sum(raw.values()) + 1e-9
            assert max_source_share(score, breakdown) <= SOURCE_CAP_RATIO + 1e-9


class TestConfidence:
    @pytest.mark.parametrize(
        ("distinct_sources", "expected"),
        [
            (0, Confidence.LOW),
            (1, Confidence.LOW),
            (2, Confidence.MEDIUM),
            (3, Confidence.HIGH),
            (4, Confidence.HIGH),
        ],
    )
    def test_confidence_tracks_corroboration_breadth(self, distinct_sources, expected):
        assert confidence_for(distinct_sources) is expected


class TestZoneId:
    @pytest.mark.parametrize(
        ("city", "domain", "expected"),
        [
            ("Delhi", "AI/ML", "delhi-ai-ml"),
            ("San Francisco", "Robotics", "san-francisco-robotics"),
            ("Delhi", "Climate & Energy", "delhi-climate-energy"),
        ],
    )
    def test_zone_ids_are_deterministic_slugs(self, city, domain, expected):
        assert zone_id_for(city, domain) == expected


class TestRawContributions:
    def test_contributions_are_summed_per_source_type(self):
        signals = [
            signal("sig_a", source_type=SourceType.STARTUP_NEWSROOM),
            signal("sig_b", source_type=SourceType.STARTUP_NEWSROOM),
            signal("sig_c", source_type=SourceType.TECH_EVENT, signal_type=SignalType.TECH_EVENT),
        ]

        raw = raw_contributions_by_source(signals, NOW)

        assert raw[SourceType.STARTUP_NEWSROOM] == pytest.approx(6.0)
        assert raw[SourceType.TECH_EVENT] == pytest.approx(1.0)

    def test_an_empty_bin_contributes_nothing(self):
        assert raw_contributions_by_source([], NOW) == {}
        assert score_signals([], NOW) == 0.0


class TestBuildZone:
    def test_duplicates_are_counted_once_but_still_reported(self):
        headline = "Enterprise IoT Corp opens R&D centre in Gurugram"
        signals = [
            signal("sig_a", title=headline, days_ago=2, area="Gurugram"),
            signal("sig_b", title=headline + "!", days_ago=1),
            signal("sig_c", title=headline.replace("centre", "center"), days_ago=0),
        ]

        zone = build_zone("Delhi", "IoT", signals, NOW)

        assert zone.signal_count == 3
        assert zone.deduplicated_count == 1
        assert len(zone.signal_ids) == 1

    def test_a_zone_marker_uses_the_locality_when_one_is_known(self):
        zone = build_zone("Delhi", "IoT", [signal("sig_a", area="Gurugram")], NOW)

        assert zone.coordinates.latitude == pytest.approx(28.4595)
        assert zone.coordinates.longitude == pytest.approx(77.0266)

    def test_three_source_types_reach_high_confidence(self):
        signals = [
            signal("sig_a", source_type=SourceType.STARTUP_NEWSROOM),
            signal("sig_b", source_type=SourceType.UNIVERSITY_RESEARCH),
            signal(
                "sig_c",
                source_type=SourceType.TECH_EVENT,
                signal_type=SignalType.TECH_EVENT,
            ),
        ]

        zone = build_zone("Delhi", "AI/ML", signals, NOW)

        assert zone.distinct_source_types == 3
        assert zone.confidence is Confidence.HIGH
        assert not zone.was_capped

    def test_a_single_chatty_source_is_capped_and_marked_low(self):
        signals = [signal(f"sig_{index}", days_ago=index) for index in range(5)]

        zone = build_zone("Delhi", "AI/ML", signals, NOW)

        assert zone.confidence is Confidence.LOW
        assert zone.was_capped
        assert zone.score == pytest.approx(
            sum(signal_contribution(s, NOW) for s in signals) * SOURCE_CAP_RATIO
        )


class TestBuildZones:
    def test_signals_are_binned_by_city_and_domain(self):
        signals = [
            signal("sig_a", city="Delhi", domain="AI/ML"),
            signal("sig_b", city="Delhi", domain="Robotics"),
            signal("sig_c", city="San Francisco", domain="AI/ML"),
        ]

        zones = build_zones(signals, NOW)

        assert {zone.zone_id for zone in zones} == {
            "delhi-ai-ml",
            "delhi-robotics",
            "san-francisco-ai-ml",
        }

    def test_zones_are_sorted_by_score_descending(self):
        signals = [
            signal("sig_weak", domain="Robotics", signal_type=SignalType.TECH_EVENT, days_ago=40),
            signal("sig_strong", domain="AI/ML", days_ago=0),
        ]

        zones = build_zones(signals, NOW)

        assert [zone.zone_id for zone in zones] == ["delhi-ai-ml", "delhi-robotics"]

    def test_min_score_filters_the_map(self):
        signals = [
            signal("sig_weak", domain="Robotics", signal_type=SignalType.TECH_EVENT, days_ago=60),
            signal("sig_strong", domain="AI/ML", days_ago=0),
        ]

        zones = build_zones(signals, NOW, min_score=1.0)

        assert [zone.zone_id for zone in zones] == ["delhi-ai-ml"]

    def test_no_signals_means_no_zones(self):
        assert build_zones([], NOW) == ()


class TestMaxSourceShare:
    def test_a_zero_score_has_no_share(self):
        assert max_source_share(0.0, ()) == 0.0

    def test_a_single_source_zone_is_all_of_its_own_score(self):
        score, breakdown = apply_source_cap({SourceType.TECH_EVENT: 5.0})

        assert max_source_share(score, breakdown) == pytest.approx(1.0)
