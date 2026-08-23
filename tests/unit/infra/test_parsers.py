"""Two output shapes, two parsers, and one rule: never half-parse an envelope.

The recorded fixtures in `tests/fixtures/cli/` are the ground truth these parsers
were written against, so they are also what the parsers are tested against.
"""

import json

import pytest
from app.infra.cli.fake import FIXTURE_DIR, fixture_names
from app.infra.cli.parsers import parse_job_output, parse_run_output, parse_status
from app.infra.cli.protocol import CliJobStatus, CliOutputError

COLLECTOR_ID = "c_mp3tuab31lswoxvpws"


def fixture(name: str) -> str:
    return (FIXTURE_DIR / f"{name}.json").read_text(encoding="utf-8")


class TestFixtureSelfCheck:
    def test_the_expected_fixtures_exist(self):
        assert set(fixture_names()) == {
            "approve_done",
            "heal_awaiting_approval",
            "run_degraded",
            "run_empty",
            "run_error",
            "run_healthy",
        }

    @pytest.mark.parametrize("name", fixture_names())
    def test_every_fixture_is_valid_json(self, name):
        assert json.loads(fixture(name)) is not None


class TestParseRunOutput:
    def test_a_bare_array_of_rows(self):
        outcome = parse_run_output(fixture("run_healthy"), COLLECTOR_ID)

        assert outcome.collector_id == COLLECTOR_ID
        assert outcome.record_count == 6
        assert all("title" in row for row in outcome.rows)

    def test_the_mutated_layout_still_returns_rows_with_fields_omitted(self):
        # Absent fields are *omitted*, not nulled. Nothing here fills a default,
        # because a filled default is what would hide the degradation.
        outcome = parse_run_output(fixture("run_degraded"), COLLECTOR_ID)

        assert outcome.record_count == 6
        assert all("title" not in row for row in outcome.rows)
        assert all("city" not in row for row in outcome.rows)
        assert all("date" in row for row in outcome.rows)

    def test_an_empty_array_is_a_valid_zero_row_run(self):
        outcome = parse_run_output(fixture("run_empty"), COLLECTOR_ID)

        assert outcome.record_count == 0

    def test_an_error_envelope_is_not_mistaken_for_a_run(self):
        with pytest.raises(CliOutputError, match="run returned an error object"):
            parse_run_output(fixture("run_error"), COLLECTOR_ID)

    @pytest.mark.parametrize(
        "wrapper",
        [
            '{"data": [{"title": "x"}]}',
            '{"results": [{"title": "x"}]}',
            '{"rows": [{"title": "x"}]}',
        ],
    )
    def test_wrapped_row_payloads_are_unwrapped(self, wrapper):
        assert parse_run_output(wrapper, COLLECTOR_ID).record_count == 1

    def test_a_banner_printed_before_the_json_is_tolerated(self):
        stdout = 'A new version of the CLI is available.\n[{"title": "x"}]'

        assert parse_run_output(stdout, COLLECTOR_ID).record_count == 1

    def test_stray_scalars_in_the_array_are_ignored(self):
        assert parse_run_output('[{"title": "x"}, null, 7, "oops"]', COLLECTOR_ID).record_count == 1

    @pytest.mark.parametrize(
        "stdout", ["", "   ", "not json at all", "<html>login required</html>"]
    )
    def test_unparseable_output_raises_rather_than_returning_nothing(self, stdout):
        # Returning zero rows here would be recorded as "the site had no articles".
        with pytest.raises(CliOutputError):
            parse_run_output(stdout, COLLECTOR_ID)

    def test_a_json_scalar_is_not_a_run_result(self):
        with pytest.raises(CliOutputError, match="expected an array"):
            parse_run_output("42", COLLECTOR_ID)


class TestParseStatus:
    @pytest.mark.parametrize(
        ("raw", "expected"),
        [
            ("done", CliJobStatus.DONE),
            ("DONE", CliJobStatus.DONE),
            ("awaiting_approval", CliJobStatus.AWAITING_APPROVAL),
            ("awaiting-approval", CliJobStatus.AWAITING_APPROVAL),
            ("Awaiting Approval", CliJobStatus.AWAITING_APPROVAL),
            ("failed", CliJobStatus.FAILED),
            ("rejected", CliJobStatus.REJECTED),
        ],
    )
    def test_known_statuses_are_mapped(self, raw, expected):
        assert parse_status(raw) is expected

    @pytest.mark.parametrize("raw", ["reticulating_splines", "", None, 7, []])
    def test_an_unrecognised_status_becomes_unknown_rather_than_raising(self, raw):
        # A new intermediate status in a future CLI release must not take the
        # endpoint down.
        assert parse_status(raw) is CliJobStatus.UNKNOWN

    def test_awaiting_approval_is_a_success_and_a_terminal_state(self):
        status = CliJobStatus.AWAITING_APPROVAL

        assert status.is_success
        assert status.is_terminal

    @pytest.mark.parametrize("status", [CliJobStatus.FAILED, CliJobStatus.REJECTED])
    def test_failure_states_are_terminal_but_not_successes(self, status):
        assert status.is_terminal
        assert not status.is_success

    @pytest.mark.parametrize("status", [CliJobStatus.QUEUED, CliJobStatus.RUNNING])
    def test_in_flight_states_are_neither(self, status):
        assert not status.is_terminal
        assert not status.is_success


class TestParseJobOutput:
    def test_a_gated_heal_carries_the_proposed_repair(self):
        outcome = parse_job_output(fixture("heal_awaiting_approval"), "c_fallback000000")

        assert outcome.collector_id == COLLECTOR_ID
        assert outcome.status is CliJobStatus.AWAITING_APPROVAL
        assert outcome.needs_approval
        assert outcome.error is None
        assert len(outcome.completed_steps) == 4
        assert outcome.diff_summary is not None
        assert "press-wrapper" in outcome.diff_summary
        assert outcome.next_step is not None
        assert "approve" in outcome.next_step
        assert len(outcome.preview_rows) == 3
        assert outcome.view_url is not None
        assert outcome.created_at is not None

    def test_an_approved_heal_is_done_and_needs_nothing_further(self):
        outcome = parse_job_output(fixture("approve_done"), "c_fallback000000")

        assert outcome.status is CliJobStatus.DONE
        assert outcome.status.is_success
        assert not outcome.needs_approval
        assert outcome.completed_steps == (
            "applied_selector_changes",
            "published_collector_version",
            "verified_run",
        )

    def test_a_failed_envelope_keeps_its_error_text(self):
        outcome = parse_job_output(fixture("run_error"), COLLECTOR_ID)

        assert outcome.status is CliJobStatus.FAILED
        assert not outcome.status.is_success
        assert outcome.error is not None
        assert "403" in outcome.error

    def test_the_fallback_collector_id_is_used_when_the_envelope_omits_one(self):
        outcome = parse_job_output('{"status": "done"}', COLLECTOR_ID)

        assert outcome.collector_id == COLLECTOR_ID

    def test_camel_case_keys_are_accepted(self):
        stdout = json.dumps(
            {
                "collectorId": COLLECTOR_ID,
                "status": "awaiting_approval",
                "completedSteps": ["analysed_page"],
                "viewUrl": "https://brightdata.com/cp/scrapers/c_mp3tuab31lswoxvpws",
                "createdAt": "2026-08-22T10:00:00Z",
                "diffSummary": "title selector moved",
                "nextStep": "brightdata scraper approve c_mp3tuab31lswoxvpws",
                "previewResult": [{"title": "x"}],
            }
        )

        outcome = parse_job_output(stdout, "c_fallback000000")

        assert outcome.collector_id == COLLECTOR_ID
        assert outcome.completed_steps == ("analysed_page",)
        assert outcome.diff_summary == "title selector moved"
        assert outcome.next_step is not None
        assert outcome.preview_rows == ({"title": "x"},)

    def test_unrecognised_keys_are_preserved_rather_than_dropped(self):
        # A CLI upgrade should add information, not lose it.
        outcome = parse_job_output('{"status": "done", "tokens_used": 1204}', COLLECTOR_ID)

        assert outcome.extra == {"tokens_used": 1204}

    @pytest.mark.parametrize("stdout", ["", "not json", "[]", '["a"]', "42"])
    def test_anything_that_is_not_an_envelope_raises(self, stdout):
        with pytest.raises(CliOutputError):
            parse_job_output(stdout, COLLECTOR_ID)
