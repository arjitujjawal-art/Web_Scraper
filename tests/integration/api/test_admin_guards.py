"""Refusals on the admin write path, before any Bright Data job slot is spent.

Every case here is one a judge or a frontend developer will hit within the first
ten minutes: a mistyped collector key, a collector that was never created, an
`approve` with nothing pending, a URL that is not in the registry.

The shared property being asserted is that each of them fails *early*, with a
status code that says whose fault it is — 404 for a name that does not exist, 409
for a name that exists in a state that refuses the operation, 422 for a request
body that could never work — and never by starting a ten-minute CLI job to find
out.
"""

from app.schemas.collectors import HEAL_PROMPT_MAX_CHARS

from tests.conftest import DEMO_KEY, DISABLED_KEY, MUTATED_URL, UNPROVISIONED_KEY

VALID_PROMPT = (
    "Article titles moved from article.news-card h2 to div.press-wrapper "
    "h3.press-wrapper__heading, and the date is now in span.release-date."
)


class TestUnknownCollector:
    async def test_a_mistyped_key_is_a_404_that_lists_the_real_ones(self, client, admin_headers):
        response = await client.post("/api/collectors/newsroom/run", headers=admin_headers)

        assert response.status_code == 404
        body = response.json()
        assert body["code"] == "unknown_collector"
        assert DEMO_KEY in body["detail"]

    async def test_the_read_side_agrees_with_the_write_side(self, client):
        response = await client.get("/api/collectors/newsroom")

        assert response.status_code == 404
        assert response.json()["code"] == "unknown_collector"


class TestCollectorState:
    async def test_a_disabled_collector_is_refused_with_409(self, client, admin_headers):
        response = await client.post(f"/api/collectors/{DISABLED_KEY}/run", headers=admin_headers)

        assert response.status_code == 409
        assert response.json()["code"] == "collector_disabled"

    async def test_an_uncreated_collector_is_refused_with_409(self, client, admin_headers):
        # Every id in the committed registry is still `PENDING`, so this is the first
        # error anyone will see on demo day. It names the command that fixes it.
        response = await client.post(
            f"/api/collectors/{UNPROVISIONED_KEY}/run", headers=admin_headers
        )

        assert response.status_code == 409
        body = response.json()
        assert body["code"] == "collector_not_provisioned"
        assert "brightdata scraper create" in body["detail"]

    async def test_approving_with_nothing_pending_is_refused_with_409(self, client, admin_headers):
        # Checked against our own run history. Asking the CLI would cost 600 seconds
        # to learn the same thing.
        response = await client.post(f"/api/collectors/{DEMO_KEY}/approve", headers=admin_headers)

        assert response.status_code == 409
        body = response.json()
        assert body["code"] == "nothing_to_approve"
        assert "/heal" in body["detail"]

    async def test_no_cli_call_is_made_by_any_refusal(self, client, admin_headers, fake_cli):
        for key in (DISABLED_KEY, UNPROVISIONED_KEY):
            await client.post(f"/api/collectors/{key}/run", headers=admin_headers)
        await client.post(f"/api/collectors/{DEMO_KEY}/approve", headers=admin_headers)

        assert fake_cli.calls == []


class TestTargetUrl:
    async def test_a_registered_alternative_url_is_accepted(self, client, admin_headers, fake_cli):
        fake_cli.enqueue_run("run_degraded")

        response = await client.post(
            f"/api/collectors/{DEMO_KEY}/run",
            headers=admin_headers,
            json={"url": MUTATED_URL},
        )

        assert response.status_code == 202

    async def test_an_unregistered_url_cannot_become_a_fetch_target(
        self, client, admin_headers, fake_cli
    ):
        # The SSRF defence, end to end: the body names a URL, the registry refuses
        # it, and no CLI invocation happens. There is no allowlist to keep current
        # because there is no code path from a request to an arbitrary address.
        response = await client.post(
            f"/api/collectors/{DEMO_KEY}/run",
            headers=admin_headers,
            json={"url": "http://169.254.169.254/latest/meta-data/"},
        )

        assert response.status_code == 404
        assert response.json()["code"] == "unknown_collector"
        assert fake_cli.calls == []

    async def test_an_unexpected_body_field_is_rejected(self, client, admin_headers):
        response = await client.post(
            f"/api/collectors/{DEMO_KEY}/run",
            headers=admin_headers,
            json={"urls": ["https://evil.test"]},
        )

        assert response.status_code == 422
        assert response.json()["code"] == "validation_error"


class TestHealPrompt:
    async def test_an_over_long_prompt_fails_at_the_edge(self, client, admin_headers, fake_cli):
        # The CLI hard-caps the prompt at 1000 characters. Rejecting it here costs a
        # round trip of milliseconds instead of ten minutes.
        response = await client.post(
            f"/api/collectors/{DEMO_KEY}/heal",
            headers=admin_headers,
            json={"prompt": "x" * (HEAL_PROMPT_MAX_CHARS + 1)},
        )

        assert response.status_code == 422
        assert response.json()["code"] == "validation_error"
        assert fake_cli.calls == []

    async def test_a_uselessly_vague_prompt_is_refused_by_the_domain_rule(
        self, client, admin_headers, fake_cli
    ):
        # Passes pydantic, fails `validate_heal_prompt`: a three-word prompt produces
        # a guess, and a guess applied to a collector is worse than no repair.
        response = await client.post(
            f"/api/collectors/{DEMO_KEY}/heal",
            headers=admin_headers,
            json={"prompt": "fix it"},
        )

        assert response.status_code == 422
        assert response.json()["code"] == "invalid_input"
        assert fake_cli.calls == []

    async def test_a_missing_body_is_a_422_not_a_500(self, client, admin_headers):
        response = await client.post(f"/api/collectors/{DEMO_KEY}/heal", headers=admin_headers)

        assert response.status_code == 422
        assert response.json()["code"] == "validation_error"

    async def test_a_usable_prompt_is_accepted(self, client, admin_headers, fake_cli):
        fake_cli.enqueue_heal("heal_awaiting_approval")

        response = await client.post(
            f"/api/collectors/{DEMO_KEY}/heal",
            headers=admin_headers,
            json={"prompt": VALID_PROMPT},
        )

        assert response.status_code == 202


class TestPolling:
    async def test_an_unknown_run_id_is_a_typed_404(self, client):
        response = await client.get("/api/collector-runs/run_does_not_exist")

        assert response.status_code == 404
        assert response.json()["code"] == "run_not_found"

    async def test_the_acknowledgement_points_at_a_url_that_resolves(
        self, client, admin_headers, fake_cli
    ):
        fake_cli.enqueue_run("run_healthy")

        acknowledgement = (
            await client.post(f"/api/collectors/{DEMO_KEY}/run", headers=admin_headers)
        ).json()
        polled = await client.get(acknowledgement["poll_url"])

        assert polled.status_code == 200
        assert polled.json()["run_id"] == acknowledgement["run_id"]
