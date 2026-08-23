"""The self-healing cycle, end to end, with no API key and no network.

This is the submission's central claim, so it is the one test that follows the
whole path a judge walks:

    HEALTHY --(the page changes)--> DEGRADED --(POST /heal)--> HEALING_REVIEW
            --(POST /approve)--> HEALED --(POST /run)--> HEALTHY

Every step goes through the real routes, the real services and the real
normalizer; only the CLI is replaced, by `FakeCli` replaying envelopes recorded
from actual `brightdata` invocations. The demo script in `docs/DEMO_SCRIPT.md` and
`FakeCli.script_healing_demo()` encode the same sequence, which is what stops the
documentation and the code from drifting apart.

Two invariants are asserted alongside the happy path, because both are claims that
would be embarrassing to get wrong on stage:

* a degraded run must not delete the signals a healthy run stored — the map does
  not go blank when one collector breaks;
* `--auto-approve` never reaches the CLI. The gap between `heal` and `approve` is
  the product.
"""

import pytest

from tests.conftest import BASELINE_URL, DEMO_KEY, MUTATED_URL
from tests.helpers import dispatch

HEAL_PROMPT = (
    "Article titles moved from article.news-card h2 to div.press-wrapper "
    "h3.press-wrapper__heading, and the city now appears in span.release-city."
)

RUN_PATH = f"/api/collectors/{DEMO_KEY}/run"
HEAL_PATH = f"/api/collectors/{DEMO_KEY}/heal"
APPROVE_PATH = f"/api/collectors/{DEMO_KEY}/approve"


@pytest.fixture
def scripted_cli(fake_cli):
    """The recorded demo: healthy run, broken run, heal, approve, recovered run."""
    return fake_cli.script_healing_demo()


async def collector(client) -> dict:
    """The demo collector as the dashboard sees it."""
    response = await client.get(f"/api/collectors/{DEMO_KEY}")
    assert response.status_code == 200, response.text
    return response.json()


async def signal_total(client) -> int:
    response = await client.get("/api/signals", params={"limit": 1})
    assert response.status_code == 200, response.text
    return int(response.json()["meta"]["total"])


class TestStepOneBaselineRun:
    async def test_the_baseline_page_yields_a_healthy_run(
        self, client, admin_headers, scripted_cli
    ):
        run = await dispatch(client, RUN_PATH, admin_headers)

        assert run["status"] == "SUCCEEDED"
        assert run["health"] == "HEALTHY"
        assert run["records_found"] == 6
        assert run["records_stored"] == 6
        assert run["fill_rate"] == 1.0
        assert run["missing_fields"] == []
        assert run["rejected_records"] == 0
        assert run["target_url"] == BASELINE_URL
        assert run["notes"] is None

    async def test_the_signals_reach_the_map(self, client, admin_headers, scripted_cli):
        await dispatch(client, RUN_PATH, admin_headers)

        zones = (await client.get("/api/zones")).json()

        assert await signal_total(client) == 6
        assert {zone["zone_id"] for zone in zones["items"]} == {
            "delhi-ai-ml",
            "delhi-iot",
            "delhi-robotics",
            "san-francisco-semiconductors",
            "san-francisco-climate-energy",
            "san-francisco-quantum",
        }

    async def test_a_healthy_collector_needs_no_attention(
        self, client, admin_headers, scripted_cli
    ):
        await dispatch(client, RUN_PATH, admin_headers)

        status = await collector(client)

        assert status["health"] == "HEALTHY"
        assert status["needs_attention"] is False
        assert status["awaiting_approval"] is False
        assert status["last_fill_rate"] == 1.0


class TestStepTwoDegradation:
    async def test_the_mutated_layout_is_visible_as_a_fill_rate_drop(
        self, client, admin_headers, scripted_cli
    ):
        # The fill rate is measured on the *raw* rows, before normalization. Normalize
        # first and a page whose titles moved just yields fewer signals — a quiet
        # under-report instead of an event someone can be shown.
        await dispatch(client, RUN_PATH, admin_headers)

        run = await dispatch(client, RUN_PATH, admin_headers, {"url": MUTATED_URL})

        assert run["status"] == "SUCCEEDED"
        assert run["health"] == "DEGRADED"
        assert run["records_found"] == 6
        assert run["fill_rate"] == 0.5
        assert run["missing_fields"] == ["title", "city"]
        assert run["target_url"] == MUTATED_URL

    async def test_every_row_is_rejected_rather_than_stored_half_empty(
        self, client, admin_headers, scripted_cli
    ):
        await dispatch(client, RUN_PATH, admin_headers)

        run = await dispatch(client, RUN_PATH, admin_headers, {"url": MUTATED_URL})

        assert run["records_stored"] == 0
        assert run["rejected_records"] == 6
        assert run["rejection_reasons"] == ["missing or too-short title"]

    async def test_the_degradation_is_explained_in_words(self, client, admin_headers, scripted_cli):
        await dispatch(client, RUN_PATH, admin_headers)

        run = await dispatch(client, RUN_PATH, admin_headers, {"url": MUTATED_URL})

        assert run["notes"] is not None
        assert "fill rate 50%" in run["notes"]
        assert "title" in run["notes"]

    async def test_the_dashboard_turns_red(self, client, admin_headers, scripted_cli):
        await dispatch(client, RUN_PATH, admin_headers)
        await dispatch(client, RUN_PATH, admin_headers, {"url": MUTATED_URL})

        listed = (await client.get("/api/collectors")).json()

        assert (await collector(client))["needs_attention"] is True
        assert listed["needs_attention"] == 1

    async def test_a_broken_collector_does_not_blank_the_map(
        self, client, admin_headers, scripted_cli
    ):
        # Signals are upserted, never replaced wholesale. A collector breaking must
        # not look like the opportunity zones ceasing to exist.
        await dispatch(client, RUN_PATH, admin_headers)
        await dispatch(client, RUN_PATH, admin_headers, {"url": MUTATED_URL})

        assert await signal_total(client) == 6
        assert len((await client.get("/api/zones")).json()["items"]) == 6


class TestStepThreeGatedRepair:
    async def test_the_repair_comes_back_for_review_not_applied(
        self, client, admin_headers, scripted_cli
    ):
        await dispatch(client, RUN_PATH, admin_headers)
        await dispatch(client, RUN_PATH, admin_headers, {"url": MUTATED_URL})

        heal = await dispatch(client, HEAL_PATH, admin_headers, {"prompt": HEAL_PROMPT})

        assert heal["status"] == "SUCCEEDED"
        assert heal["health"] == "HEALING_REVIEW"
        assert heal["cli_status"] == "awaiting_approval"
        assert heal["error"] is None

    async def test_the_proposed_repair_is_shown_before_it_is_applied(
        self, client, admin_headers, scripted_cli
    ):
        # `diff_summary` plus `preview_rows` *is* the review screen. Storing them on
        # the run row rather than only logging them is what makes the gate reviewable.
        await dispatch(client, RUN_PATH, admin_headers)
        await dispatch(client, RUN_PATH, admin_headers, {"url": MUTATED_URL})

        heal = await dispatch(client, HEAL_PATH, admin_headers, {"prompt": HEAL_PROMPT})

        assert heal["diff_summary"] is not None
        assert "press-wrapper" in heal["diff_summary"]
        assert heal["next_step"] is not None and "approve" in heal["next_step"]
        assert heal["preview_rows"] is not None
        assert len(heal["preview_rows"]) == 3
        assert all("title" in row for row in heal["preview_rows"])
        assert heal["view_url"] is not None

    async def test_the_prompt_that_was_sent_is_recorded_on_the_run(
        self, client, admin_headers, scripted_cli
    ):
        await dispatch(client, RUN_PATH, admin_headers)
        await dispatch(client, RUN_PATH, admin_headers, {"url": MUTATED_URL})

        heal = await dispatch(client, HEAL_PATH, admin_headers, {"prompt": HEAL_PROMPT})

        assert heal["heal_prompt"] == HEAL_PROMPT
        assert scripted_cli.prompts() == (HEAL_PROMPT,)

    async def test_a_pending_repair_is_flagged_as_blocked_on_a_human(
        self, client, admin_headers, scripted_cli
    ):
        await dispatch(client, RUN_PATH, admin_headers)
        await dispatch(client, RUN_PATH, admin_headers, {"url": MUTATED_URL})
        await dispatch(client, HEAL_PATH, admin_headers, {"prompt": HEAL_PROMPT})

        status = await collector(client)

        assert status["awaiting_approval"] is True
        assert status["health"] == "HEALING_REVIEW"
        assert status["needs_attention"] is True


async def heal_and_approve(client, admin_headers) -> dict:
    """Walk the first four steps and return the approval run."""
    await dispatch(client, RUN_PATH, admin_headers)
    await dispatch(client, RUN_PATH, admin_headers, {"url": MUTATED_URL})
    await dispatch(client, HEAL_PATH, admin_headers, {"prompt": HEAL_PROMPT})
    return await dispatch(client, APPROVE_PATH, admin_headers)


class TestStepFourApproval:
    async def test_approval_applies_the_repair(self, client, admin_headers, scripted_cli):
        approval = await heal_and_approve(client, admin_headers)

        assert approval["status"] == "SUCCEEDED"
        assert approval["health"] == "HEALED"
        assert approval["cli_status"] == "done"
        assert approval["action"] == "approve"
        assert approval["error"] is None

    async def test_the_collector_is_no_longer_waiting_on_anyone(
        self, client, admin_headers, scripted_cli
    ):
        await heal_and_approve(client, admin_headers)

        status = await collector(client)

        assert status["awaiting_approval"] is False
        assert status["health"] == "HEALED"
        assert status["needs_attention"] is False

    async def test_the_same_repair_cannot_be_approved_twice(
        self, client, admin_headers, scripted_cli
    ):
        # The pending heal row is stamped when it is applied. Without that, a second
        # click would queue an approve for a repair that no longer exists — and
        # `FakeCli` would raise on the unscripted call, which is how this was found.
        await heal_and_approve(client, admin_headers)

        second = await client.post(APPROVE_PATH, headers=admin_headers)

        assert second.status_code == 409
        assert second.json()["code"] == "nothing_to_approve"


class TestStepFiveRecovery:
    async def test_the_mutated_page_parses_again_with_no_code_change(
        self, client, admin_headers, scripted_cli
    ):
        # The recovery run replays `run_healthy` against the *mutated* URL: same
        # collector id, same application code, repaired selectors. That is the whole
        # claim — the fix happened in Scraper Studio, not in this repository.
        await heal_and_approve(client, admin_headers)

        recovered = await dispatch(client, RUN_PATH, admin_headers, {"url": MUTATED_URL})

        assert recovered["health"] == "HEALTHY"
        assert recovered["fill_rate"] == 1.0
        assert recovered["records_stored"] == 6
        assert recovered["missing_fields"] == []
        assert recovered["target_url"] == MUTATED_URL

    async def test_the_dashboard_goes_green_again(self, client, admin_headers, scripted_cli):
        await heal_and_approve(client, admin_headers)
        await dispatch(client, RUN_PATH, admin_headers, {"url": MUTATED_URL})

        listed = (await client.get("/api/collectors")).json()

        assert (await collector(client))["health"] == "HEALTHY"
        assert listed["needs_attention"] == 0

    async def test_recovery_re_stores_the_same_signals_rather_than_duplicating_them(
        self, client, admin_headers, scripted_cli
    ):
        # Signal ids are derived from the source URL, so a re-run of the same page is
        # an update. Six signals in, six signals after a heal cycle — not twelve.
        await heal_and_approve(client, admin_headers)
        await dispatch(client, RUN_PATH, admin_headers, {"url": MUTATED_URL})

        assert await signal_total(client) == 6
        assert len((await client.get("/api/zones")).json()["items"]) == 6


class TestTheAuditTrail:
    async def test_the_five_operations_are_recorded_in_order(
        self, client, admin_headers, scripted_cli
    ):
        await heal_and_approve(client, admin_headers)
        await dispatch(client, RUN_PATH, admin_headers, {"url": MUTATED_URL})

        assert scripted_cli.actions() == ("run", "run", "heal", "approve", "run")

    async def test_the_repair_was_approved_by_a_separate_deliberate_call(
        self, client, admin_headers, scripted_cli
    ):
        # `heal` and `approve` are distinct CLI invocations with a reviewable state in
        # between. `--auto-approve` exists in the CLI and is never passed; that it is
        # absent from every argv is asserted in `test_no_shell_and_no_auto_approve.py`.
        await heal_and_approve(client, admin_headers)

        heal_call, approve_call = scripted_cli.calls[2], scripted_cli.calls[3]

        assert heal_call.action == "heal" and heal_call.prompt == HEAL_PROMPT
        assert approve_call.action == "approve"
        assert approve_call.collector_id == heal_call.collector_id

    async def test_the_whole_cycle_is_readable_from_the_run_history(
        self, client, admin_headers, scripted_cli
    ):
        # One request a judge can run after the demo to see the entire story.
        await heal_and_approve(client, admin_headers)
        await dispatch(client, RUN_PATH, admin_headers, {"url": MUTATED_URL})

        history = (await client.get("/api/collector-runs")).json()

        assert history["total"] == 5
        assert [item["action"] for item in history["items"]] == [
            "run",
            "approve",
            "heal",
            "run",
            "run",
        ]
        assert [item["health"] for item in history["items"]] == [
            "HEALTHY",
            "HEALED",
            # The heal row is re-stamped `HEALED` when its repair is applied. It is the
            # row `latest_awaiting_approval` looks at, so leaving it in
            # `HEALING_REVIEW` would advertise a pending repair that no longer exists.
            "HEALED",
            "DEGRADED",
            "HEALTHY",
        ]
        assert all(item["status"] == "SUCCEEDED" for item in history["items"])
