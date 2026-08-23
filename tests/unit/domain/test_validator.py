"""Quality assessment and CLI input validation.

`build_run_report` is the detector: the fill-rate drop it computes *is* the
observable failure in the self-healing demo. The validators are the last pure check
before a value becomes a subprocess argument.
"""

import pytest
from app.domain.enums import CollectorHealth
from app.domain.models import RawRecord
from app.domain.validator import (
    DEFAULT_FILL_RATE_THRESHOLD,
    MAX_HEAL_PROMPT_LENGTH,
    MIN_HEAL_PROMPT_LENGTH,
    ValidationError,
    assess_health,
    build_run_report,
    describe_degradation,
    validate_collector_id,
    validate_heal_prompt,
)

REQUIRED = ("title", "date", "city", "domain")

COMPLETE_ROW = {
    "title": "Enterprise IoT Corp opens R&D centre in Gurugram",
    "date": "2026-08-14",
    "city": "Gurugram, Delhi NCR",
    "domain": "Internet of things",
}

# What the mutated fixture produces: the selectors for title and city no longer
# match, so those keys are omitted entirely rather than returned empty.
MUTATED_ROW = {"date": "2026-08-14", "domain": "Internet of things"}


def record(fields: dict[str, object]) -> RawRecord:
    return RawRecord(fields=fields, collector_key="demo_newsroom")


class TestValidateCollectorId:
    def test_a_real_looking_id_passes_unchanged(self):
        assert validate_collector_id("c_mp3tuab31lswoxvpws") == "c_mp3tuab31lswoxvpws"

    def test_surrounding_whitespace_is_stripped(self):
        assert validate_collector_id("  c_mp3tuab31lswoxvpws\n") == "c_mp3tuab31lswoxvpws"

    @pytest.mark.parametrize(
        "candidate",
        [
            "c_x; rm -rf /",
            "c_abc123 && curl evil.test",
            "c_abc123$(whoami)",
            "c_abc123|cat /etc/passwd",
            "c_ABC123456",
            "c_short",
            "collector_1234567",
            "PENDING",
            "",
            "   ",
            "--auto-approve",
            "-o /tmp/out.json",
        ],
    )
    def test_anything_that_is_not_a_server_assigned_id_is_refused(self, candidate):
        with pytest.raises(ValidationError):
            validate_collector_id(candidate)

    def test_the_error_explains_where_ids_come_from(self):
        with pytest.raises(ValidationError, match="scraper create"):
            validate_collector_id("c_x; rm -rf /")


class TestValidateHealPrompt:
    def test_a_descriptive_prompt_passes_and_is_stripped(self):
        prompt = "  The title selector moved to div.press-wrapper h3.  "

        assert validate_heal_prompt(prompt) == prompt.strip()

    def test_a_prompt_at_the_minimum_length_is_accepted(self):
        assert validate_heal_prompt("x" * MIN_HEAL_PROMPT_LENGTH)

    def test_a_prompt_one_character_short_is_refused(self):
        with pytest.raises(ValidationError, match=str(MIN_HEAL_PROMPT_LENGTH)):
            validate_heal_prompt("x" * (MIN_HEAL_PROMPT_LENGTH - 1))

    def test_a_prompt_at_the_cli_cap_is_accepted(self):
        assert len(validate_heal_prompt("x" * MAX_HEAL_PROMPT_LENGTH)) == MAX_HEAL_PROMPT_LENGTH

    def test_a_prompt_one_character_over_the_cli_cap_is_refused(self):
        # The CLI validates this client-side; failing here turns a confusing
        # subprocess error into a 422.
        with pytest.raises(ValidationError, match="at most"):
            validate_heal_prompt("x" * (MAX_HEAL_PROMPT_LENGTH + 1))

    def test_whitespace_does_not_count_towards_the_minimum(self):
        with pytest.raises(ValidationError):
            validate_heal_prompt("  fix it  ")


class TestBuildRunReport:
    def test_a_complete_run_scores_a_full_fill_rate(self):
        report = build_run_report([record(COMPLETE_ROW)] * 6, REQUIRED)

        assert report.records_found == 6
        assert report.required_fields_total == 24
        assert report.required_fields_present == 24
        assert report.fill_rate == 1.0
        assert report.missing_fields == ()
        assert not report.is_empty

    def test_the_mutated_layout_halves_the_fill_rate(self):
        report = build_run_report([record(MUTATED_ROW)] * 6, REQUIRED)

        assert report.fill_rate == 0.5
        assert report.missing_fields == ("title", "city")

    def test_a_field_missing_from_only_some_rows_lowers_the_rate_without_being_listed(self):
        rows = [record(COMPLETE_ROW), record({**COMPLETE_ROW, "city": ""})]

        report = build_run_report(rows, REQUIRED)

        assert report.fill_rate == 0.875
        assert report.missing_fields == ()

    def test_an_empty_run_scores_zero_not_one(self):
        # Treating "returned nothing" as perfect coverage is how a broken collector
        # stays green on the dashboard.
        report = build_run_report([], REQUIRED)

        assert report.records_found == 0
        assert report.fill_rate == 0.0
        assert report.is_empty
        assert report.missing_fields == REQUIRED

    def test_rejections_are_carried_through(self):
        report = build_run_report(
            [record(COMPLETE_ROW)],
            REQUIRED,
            rejected_records=6,
            rejection_reasons=("missing or too-short title",),
        )

        assert report.rejected_records == 6
        assert report.rejection_reasons == ("missing or too-short title",)

    def test_required_fields_must_not_be_empty(self):
        with pytest.raises(ValidationError, match="required_fields"):
            build_run_report([record(COMPLETE_ROW)], ())


class TestAssessHealth:
    def test_a_full_run_is_healthy(self):
        report = build_run_report([record(COMPLETE_ROW)], REQUIRED)

        assert assess_health(report) is CollectorHealth.HEALTHY

    def test_the_mutated_layout_is_degraded(self):
        report = build_run_report([record(MUTATED_ROW)] * 6, REQUIRED)

        assert assess_health(report) is CollectorHealth.DEGRADED

    def test_an_empty_run_is_degraded_even_though_its_rate_is_undefined(self):
        assert assess_health(build_run_report([], REQUIRED)) is CollectorHealth.DEGRADED

    def test_the_threshold_is_inclusive(self):
        rows = [record(COMPLETE_ROW)] * 4 + [record({**COMPLETE_ROW, "city": ""})]
        report = build_run_report(rows, REQUIRED)

        assert report.fill_rate == pytest.approx(0.95)
        assert assess_health(report, threshold=0.95) is CollectorHealth.HEALTHY
        assert assess_health(report, threshold=0.96) is CollectorHealth.DEGRADED

    def test_the_default_threshold_is_the_documented_one(self):
        assert DEFAULT_FILL_RATE_THRESHOLD == 0.8


class TestDescribeDegradation:
    def test_an_empty_run_says_so_plainly(self):
        described = describe_degradation(build_run_report([], REQUIRED))

        assert described == "collector returned no records"

    def test_a_partial_run_names_the_rate_and_the_missing_fields(self):
        report = build_run_report([record(MUTATED_ROW)] * 6, REQUIRED)

        described = describe_degradation(report)

        assert "50%" in described
        assert "title" in described
        assert "city" in described

    def test_rejected_records_are_mentioned(self):
        report = build_run_report(
            [record(MUTATED_ROW)] * 6,
            REQUIRED,
            rejected_records=6,
            rejection_reasons=("missing or too-short title",),
        )

        assert "6 record(s) failed normalization" in describe_degradation(report)
