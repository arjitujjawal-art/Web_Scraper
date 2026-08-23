"""The test double is itself worth testing, because the suite's honesty rests on it.

`FakeCli` only proves something if it applies the same validation as the real
adapter and refuses to invent responses nobody scripted.
"""

import pytest
from app.domain.validator import ValidationError
from app.infra.cli.fake import FakeCli, RecordedCall, fixture_names
from app.infra.cli.protocol import (
    CliFailure,
    CliJobStatus,
    CliOutputError,
    ScraperCli,
)

COLLECTOR_ID = "c_mp3tuab31lswoxvpws"
PROMPT = "The title selector moved to div.press-wrapper h3.press-wrapper__heading."
URL = "https://example.test/signal-atlas/fixtures/newsroom_v1.html"


class TestProtocolConformance:
    def test_the_fake_satisfies_the_protocol_the_application_depends_on(self):
        assert isinstance(FakeCli(), ScraperCli)


class TestLoad:
    @pytest.mark.parametrize("name", fixture_names())
    def test_every_recorded_fixture_is_loadable(self, name):
        assert FakeCli().load(name).strip()

    def test_a_missing_fixture_fails_the_test_rather_than_the_pipeline(self):
        with pytest.raises(AssertionError, match="CLI fixture not found"):
            FakeCli().load("no_such_fixture")


class TestRun:
    async def test_a_fixture_name_is_replayed(self):
        cli = FakeCli().enqueue_run("run_healthy")

        outcome = await cli.run(COLLECTOR_ID, URL, label="demo")

        assert outcome.record_count == 6
        assert outcome.collector_id == COLLECTOR_ID
        assert outcome.argv == ("scraper", "run", COLLECTOR_ID)

    async def test_literal_json_is_used_verbatim(self):
        cli = FakeCli().enqueue_run('[{"title": "x"}]')

        assert (await cli.run(COLLECTOR_ID)).record_count == 1

    async def test_queued_payloads_are_returned_in_order(self):
        cli = FakeCli().enqueue_run("run_healthy", "run_degraded", "run_empty")

        counts = [(await cli.run(COLLECTOR_ID)).record_count for _ in range(3)]

        assert counts == [6, 6, 0]

    async def test_a_queued_exception_is_raised(self):
        cli = FakeCli().enqueue_run(CliFailure("zone cli_unlocker returned 403"))

        with pytest.raises(CliFailure, match="403"):
            await cli.run(COLLECTOR_ID)

    async def test_an_unscripted_call_is_a_test_bug_not_a_cli_error(self):
        # AssertionError, deliberately: a forgotten enqueue must not quietly
        # exercise the service's error-handling path instead.
        with pytest.raises(AssertionError, match="unscripted `run`"):
            await FakeCli().run(COLLECTOR_ID)

    async def test_the_same_id_validation_as_the_real_adapter_applies(self):
        cli = FakeCli().enqueue_run("run_healthy")

        with pytest.raises(ValidationError):
            await cli.run("c_x; rm -rf /")

    async def test_a_malformed_payload_surfaces_as_an_output_error(self):
        cli = FakeCli().enqueue_run('{"error": "collector not found"}')

        with pytest.raises(CliOutputError):
            await cli.run(COLLECTOR_ID)


class TestHealAndApprove:
    async def test_a_gated_heal_returns_the_proposed_repair(self):
        cli = FakeCli().enqueue_heal("heal_awaiting_approval")

        outcome = await cli.heal(COLLECTOR_ID, PROMPT)

        assert outcome.status is CliJobStatus.AWAITING_APPROVAL
        assert outcome.needs_approval
        assert len(outcome.preview_rows) == 3
        assert outcome.argv == ("scraper", "heal", COLLECTOR_ID)

    async def test_the_prompt_is_validated_and_stripped_before_being_recorded(self):
        cli = FakeCli().enqueue_heal("heal_awaiting_approval")

        await cli.heal(COLLECTOR_ID, f"  {PROMPT}  ")

        assert cli.prompts() == (PROMPT,)

    async def test_a_too_short_prompt_never_reaches_the_queue(self):
        cli = FakeCli().enqueue_heal("heal_awaiting_approval")

        with pytest.raises(ValidationError):
            await cli.heal(COLLECTOR_ID, "fix it")

        assert cli.calls == []

    async def test_approval_applies_the_repair(self):
        cli = FakeCli().enqueue_approve("approve_done")

        outcome = await cli.approve(COLLECTOR_ID)

        assert outcome.status is CliJobStatus.DONE
        assert outcome.argv == ("scraper", "approve", COLLECTOR_ID)

    async def test_an_unscripted_approve_names_the_helper_that_fixes_it(self):
        with pytest.raises(AssertionError, match="enqueue_approve"):
            await FakeCli().approve(COLLECTOR_ID)


class TestScriptHealingDemo:
    async def test_the_scripted_demo_drives_the_whole_cycle(self):
        cli = FakeCli().script_healing_demo()

        healthy = await cli.run(COLLECTOR_ID, URL)
        degraded = await cli.run(COLLECTOR_ID, URL)
        healed = await cli.heal(COLLECTOR_ID, PROMPT)
        approved = await cli.approve(COLLECTOR_ID)
        recovered = await cli.run(COLLECTOR_ID, URL)

        assert healthy.record_count == 6
        assert all("title" in row for row in healthy.rows)
        assert degraded.record_count == 6
        assert all("title" not in row for row in degraded.rows)
        assert healed.needs_approval
        assert approved.status is CliJobStatus.DONE
        assert all("title" in row for row in recovered.rows)

    async def test_the_recorded_calls_are_the_demo_script(self):
        cli = FakeCli().script_healing_demo()

        await cli.run(COLLECTOR_ID, URL)
        await cli.run(COLLECTOR_ID, URL)
        await cli.heal(COLLECTOR_ID, PROMPT)
        await cli.approve(COLLECTOR_ID)
        await cli.run(COLLECTOR_ID, URL)

        assert cli.actions() == ("run", "run", "heal", "approve", "run")
        assert cli.calls[0] == RecordedCall("run", COLLECTOR_ID, url=URL)

    async def test_no_call_ever_carries_auto_approve(self):
        # The approval gate is the demo. A fake that quietly bypassed it would make
        # the integration suite pass while the product claim was false.
        cli = FakeCli().script_healing_demo()

        await cli.run(COLLECTOR_ID, URL)
        await cli.heal(COLLECTOR_ID, PROMPT)
        await cli.approve(COLLECTOR_ID)

        recorded = " ".join(
            part
            for call in cli.calls
            for part in (call.action, call.collector_id, call.url or "", call.prompt or "")
        )
        assert "--auto-approve" not in recorded
        assert "--reject" not in recorded
