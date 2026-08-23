"""Date parsing is the highest-risk pure function in the project.

A wrong date does not raise — it silently changes a zone's score through the decay
term. These tests pin the shapes the four real collectors actually produce, and pin
the refusal to guess.
"""

from datetime import UTC, date, datetime, timedelta

import pytest
from app.domain.dates import age_in_days, parse_signal_date

NOW = datetime(2026, 8, 22, 12, 0, tzinfo=UTC)


class TestParseSignalDate:
    def test_iso_string(self):
        assert parse_signal_date("2026-08-14", NOW) == datetime(2026, 8, 14, tzinfo=UTC)

    def test_iso_string_with_zulu_suffix(self):
        parsed = parse_signal_date("2026-08-14T09:30:00Z", NOW)
        assert parsed == datetime(2026, 8, 14, 9, 30, tzinfo=UTC)

    def test_datetime_passthrough_is_made_aware(self):
        naive = datetime(2026, 8, 14, 9, 30)  # noqa: DTZ001 — the point of the test
        assert parse_signal_date(naive, NOW) == datetime(2026, 8, 14, 9, 30, tzinfo=UTC)

    def test_date_object_becomes_midnight_utc(self):
        assert parse_signal_date(date(2026, 8, 14), NOW) == datetime(2026, 8, 14, tzinfo=UTC)

    @pytest.mark.parametrize(
        "text",
        ["14 August 2026", "Aug 14, 2026", "14 Aug 2026", "2026/08/14", "14-08-2026"],
    )
    def test_explicit_formats(self, text):
        assert parse_signal_date(text, NOW) == datetime(2026, 8, 14, tzinfo=UTC)

    def test_date_embedded_in_a_url_path(self):
        # Berkeley prints no date line; the date is only in the article URL.
        url = "https://news.berkeley.edu/2026/08/21/quantum-sensing-grant/"
        assert parse_signal_date(url, NOW) == datetime(2026, 8, 21, tzinfo=UTC)

    def test_bare_day_month_resolves_to_the_current_year(self):
        # IIT Delhi news cards render "20 / Aug".
        assert parse_signal_date("20 / Aug", NOW) == datetime(2026, 8, 20, tzinfo=UTC)

    def test_bare_day_month_within_tolerance_stays_in_this_year(self):
        # A conference announced a few weeks ahead is not last year's edition.
        assert parse_signal_date("20 / Sep", NOW) == datetime(2026, 9, 20, tzinfo=UTC)

    def test_bare_day_month_far_in_the_future_rolls_back_a_year(self):
        assert parse_signal_date("20 / Dec", NOW) == datetime(2025, 12, 20, tzinfo=UTC)

    @pytest.mark.parametrize(
        "value",
        ["", "   ", "last Tuesday", "coming soon", "TBA", "31 / Feb", None, 20260814, [], {}],
    )
    def test_unparseable_values_are_rejected_not_defaulted(self, value):
        # The whole point: returning `now` here would give a stale record maximum
        # freshness under exponential decay.
        assert parse_signal_date(value, NOW) is None


class TestAgeInDays:
    def test_age_of_a_past_signal(self):
        assert age_in_days(NOW - timedelta(days=10), NOW) == pytest.approx(10.0)

    def test_future_signal_is_floored_at_zero(self):
        assert age_in_days(NOW + timedelta(days=10), NOW) == 0.0

    def test_naive_input_is_treated_as_utc(self):
        naive = datetime(2026, 8, 12, 12, 0)  # noqa: DTZ001 — SQLAlchemy can hand this back
        assert age_in_days(naive, NOW) == pytest.approx(10.0)
