"""The admin routes are the only ones that spend money, and the only ones locked.

Three things are asserted here, and each of them is a claim the README makes:

1. `run`, `heal` and `approve` are unreachable without `X-Admin-Key`, and the
   refusal uses the project's single error envelope rather than FastAPI's default;
2. an *unset* key disables the routes instead of opening them — the failure mode
   that turns a demo backend into an open door;
3. read routes stay public, so the frontend never ships a secret to a browser.

The guard is asserted per route, not once: a dependency declared on the router is
only protection if every handler in it inherits it.
"""

from app.api.security import ADMIN_KEY_HEADER
from app.config import Settings
from app.main import create_app
from httpx import ASGITransport, AsyncClient

from tests.conftest import DEMO_KEY

HEAL_PROMPT = (
    "Article titles moved from article.news-card h2 to div.press-wrapper "
    "h3.press-wrapper__heading, and the date is now in span.release-date."
)

ADMIN_PATHS = (
    (f"/api/collectors/{DEMO_KEY}/run", None),
    (f"/api/collectors/{DEMO_KEY}/heal", {"prompt": HEAL_PROMPT}),
    (f"/api/collectors/{DEMO_KEY}/approve", None),
)

PUBLIC_PATHS = (
    "/api/health",
    "/api/signals",
    "/api/zones",
    "/api/collectors",
    "/api/collector-runs",
)


class TestAdminRoutesAreLocked:
    async def test_every_admin_route_refuses_a_request_with_no_key(self, client):
        for path, body in ADMIN_PATHS:
            response = await client.post(path, json=body)

            assert response.status_code == 401, path
            assert response.json()["code"] == "unauthorized", path

    async def test_a_wrong_key_is_refused_the_same_way_as_a_missing_one(self, client):
        # Same status, same envelope: distinguishing "absent" from "incorrect" tells
        # an attacker which half of the guess was right.
        response = await client.post(
            f"/api/collectors/{DEMO_KEY}/run", headers={ADMIN_KEY_HEADER: "not-the-key"}
        )

        assert response.status_code == 401
        assert response.json()["code"] == "unauthorized"

    async def test_the_refusal_names_the_header_a_client_should_send(self, client):
        response = await client.post(f"/api/collectors/{DEMO_KEY}/run")

        assert response.headers["www-authenticate"] == ADMIN_KEY_HEADER
        assert ADMIN_KEY_HEADER in response.json()["detail"]

    async def test_the_key_unlocks_the_route(self, client, admin_headers, fake_cli):
        fake_cli.enqueue_run("run_healthy")

        response = await client.post(f"/api/collectors/{DEMO_KEY}/run", headers=admin_headers)

        assert response.status_code == 202


class TestAnUnsetKeyDisablesRatherThanOpens:
    async def test_admin_routes_return_503_when_no_key_is_configured(self, settings: Settings):
        # `ensure_serving_is_safe` refuses this configuration at startup; this is the
        # second lock on the same door, for the case where a deployment skips it.
        app = create_app(settings.model_copy(update={"admin_api_key": ""}))
        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://testserver") as unsafe:
                response = await unsafe.post(
                    f"/api/collectors/{DEMO_KEY}/run",
                    headers={ADMIN_KEY_HEADER: "anything-at-all"},
                )
        finally:
            await app.state.engine.dispose()

        assert response.status_code == 503
        assert response.json()["code"] == "unavailable"


class TestReadRoutesStayPublic:
    async def test_no_read_route_requires_a_key(self, client):
        for path in PUBLIC_PATHS:
            response = await client.get(path)

            assert response.status_code == 200, path


class TestCors:
    async def test_the_configured_frontend_origin_is_allowed(self, client):
        response = await client.get("/api/health", headers={"Origin": "http://localhost:5173"})

        assert response.headers["access-control-allow-origin"] == "http://localhost:5173"

    async def test_credentialed_cors_is_never_enabled(self, client):
        # The API authenticates with a header, never a cookie. Allowing credentials
        # would let a browser attach one automatically to an admin route.
        response = await client.get("/api/health", headers={"Origin": "http://localhost:5173"})

        assert "access-control-allow-credentials" not in response.headers

    async def test_an_unlisted_origin_gets_no_allow_header(self, client):
        response = await client.get("/api/health", headers={"Origin": "https://evil.test"})

        assert "access-control-allow-origin" not in response.headers
