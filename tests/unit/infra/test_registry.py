"""The registry is the reason there is no SSRF here, so it is tested as a control.

Two things matter: a caller can never name a URL that is not already configured,
and an unset `${PLACEHOLDER}` fails loudly instead of expanding to nothing.
"""

from pathlib import Path

import pytest
from app.domain.enums import SourceType
from app.infra.registry import (
    DEFAULT_REQUIRED_FIELDS,
    CollectorRegistry,
    CollectorSpec,
    RegistryError,
    expand_placeholders,
    load_registry,
)

from tests.conftest import (
    BASELINE_URL,
    DEMO_KEY,
    DISABLED_KEY,
    FIXTURE_BASE_URL,
    MUTATED_URL,
    REAL_REGISTRY_PATH,
    TEST_REGISTRY_PATH,
    UNPROVISIONED_KEY,
)

ENVIRONMENT = {"FIXTURE_BASE_URL": FIXTURE_BASE_URL}

# `brightdata scraper create` caps its description argument at 500 characters
# (verified against CLI 0.3.5 --help). The constant lives here rather than in
# `app/` because the application never runs `create` — provisioning is a one-off
# manual step, and a production constant with no production caller is dead code.
CREATE_DESCRIPTION_MAX_CHARS = 500


@pytest.fixture
def registry() -> CollectorRegistry:
    return load_registry(TEST_REGISTRY_PATH, ENVIRONMENT)


def spec(key: str = "demo", urls: tuple[str, ...] = ("https://example.test/a",)) -> CollectorSpec:
    return CollectorSpec(
        key=key,
        source_type=SourceType.STARTUP_NEWSROOM,
        collector_id="c_abcdef123456",
        urls=urls,
    )


class TestExpandPlaceholders:
    def test_a_configured_placeholder_is_substituted(self):
        expanded = expand_placeholders("${FIXTURE_BASE_URL}/newsroom_v1.html", ENVIRONMENT)

        assert expanded == BASELINE_URL

    def test_a_trailing_slash_in_the_value_is_not_doubled(self):
        expanded = expand_placeholders("${BASE}/x.html", {"BASE": "https://example.test/"})

        assert expanded == "https://example.test/x.html"

    @pytest.mark.parametrize("environment", [{}, {"FIXTURE_BASE_URL": ""}])
    def test_an_unset_placeholder_raises_rather_than_expanding_to_nothing(self, environment):
        # An empty substitution yields "/newsroom_v1.html", which the CLI accepts
        # and scrapes nothing from — a broken demo that looks like a broken site.
        with pytest.raises(RegistryError, match="FIXTURE_BASE_URL"):
            expand_placeholders("${FIXTURE_BASE_URL}/newsroom_v1.html", environment)

    def test_text_without_placeholders_is_returned_unchanged(self):
        assert expand_placeholders("https://news.berkeley.edu/", {}) == "https://news.berkeley.edu/"


class TestLoadRegistry:
    def test_the_test_registry_loads_every_entry(self, registry):
        assert len(registry) == 4
        assert registry.keys() == (
            DEMO_KEY,
            "univ_research_sf",
            DISABLED_KEY,
            UNPROVISIONED_KEY,
        )

    def test_the_demo_collector_carries_both_fixture_urls(self, registry):
        demo = registry.get(DEMO_KEY)

        assert demo.urls == (BASELINE_URL, MUTATED_URL)
        assert demo.primary_url == BASELINE_URL
        assert demo.source_type is SourceType.STARTUP_NEWSROOM
        assert demo.city_hint == "Delhi"
        assert demo.tags == ("demo", "fixture")

    def test_required_fields_default_when_the_entry_omits_them(self, registry):
        assert registry.get(DISABLED_KEY).required_fields == DEFAULT_REQUIRED_FIELDS

    def test_a_missing_file_is_a_registry_error_not_a_crash(self, tmp_path: Path):
        with pytest.raises(RegistryError, match="not found"):
            load_registry(tmp_path / "absent.yaml", ENVIRONMENT)

    def test_an_empty_file_loads_as_an_empty_registry(self, tmp_path: Path):
        path = tmp_path / "empty.yaml"
        path.write_text("", encoding="utf-8")

        assert len(load_registry(path, ENVIRONMENT)) == 0

    def test_a_bare_list_is_accepted_as_well_as_a_collectors_key(self, tmp_path: Path):
        path = tmp_path / "bare.yaml"
        path.write_text(
            '- key: only\n  source_type: tech_event\n  urls: "https://example.test/e"\n',
            encoding="utf-8",
        )

        loaded = load_registry(path, ENVIRONMENT)

        assert loaded.get("only").urls == ("https://example.test/e",)

    def test_an_unknown_source_type_fails_at_load_time(self, tmp_path: Path):
        path = tmp_path / "bad_type.yaml"
        path.write_text("- key: x\n  source_type: blog_comments\n", encoding="utf-8")

        with pytest.raises(RegistryError, match="invalid registry entry"):
            load_registry(path, ENVIRONMENT)

    def test_an_entry_without_a_key_fails_at_load_time(self, tmp_path: Path):
        path = tmp_path / "no_key.yaml"
        path.write_text("- source_type: tech_event\n", encoding="utf-8")

        with pytest.raises(RegistryError, match="invalid registry entry"):
            load_registry(path, ENVIRONMENT)

    def test_a_mapping_where_a_list_belongs_is_refused(self, tmp_path: Path):
        path = tmp_path / "bad_urls.yaml"
        path.write_text(
            "- key: x\n  source_type: tech_event\n  urls:\n    a: b\n", encoding="utf-8"
        )

        with pytest.raises(RegistryError, match="`urls` must be"):
            load_registry(path, ENVIRONMENT)


class TestCollectorRegistry:
    def test_duplicate_keys_are_refused(self):
        with pytest.raises(RegistryError, match="duplicate collector keys"):
            CollectorRegistry([spec(key="same"), spec(key="same")])

    def test_membership_and_listing(self, registry):
        assert DEMO_KEY in registry
        assert "nope" not in registry
        assert len(registry.all()) == 4

    def test_disabled_collectors_are_listed_but_not_enabled(self, registry):
        enabled = {collector.key for collector in registry.enabled()}

        assert DISABLED_KEY not in enabled
        assert DEMO_KEY in enabled
        assert registry.get(DISABLED_KEY).enabled is False

    def test_an_unknown_key_names_the_valid_alternatives(self, registry):
        with pytest.raises(RegistryError, match="registered keys are"):
            registry.get("events")


class TestIsProvisioned:
    def test_a_captured_id_counts_as_provisioned(self, registry):
        assert registry.get(DEMO_KEY).is_provisioned

    def test_pending_means_the_collector_does_not_exist_yet(self, registry):
        assert not registry.get(UNPROVISIONED_KEY).is_provisioned

    def test_a_collector_with_no_urls_has_no_primary_url(self):
        assert spec(urls=()).primary_url is None


class TestResolveUrl:
    def test_no_url_given_uses_the_primary(self, registry):
        assert registry.resolve_url(DEMO_KEY) == BASELINE_URL

    def test_a_configured_alternative_is_allowed(self, registry):
        # This is the whole mechanism behind the healing demo: same collector,
        # second URL, and the caller still cannot name an address of their own.
        assert registry.resolve_url(DEMO_KEY, MUTATED_URL) == MUTATED_URL

    @pytest.mark.parametrize(
        "url",
        [
            "https://evil.test/steal",
            "http://169.254.169.254/latest/meta-data/",
            "file:///etc/passwd",
            f"{BASELINE_URL}?x=1",
        ],
    )
    def test_an_unconfigured_url_is_refused(self, registry, url):
        with pytest.raises(RegistryError, match="is not configured for collector"):
            registry.resolve_url(DEMO_KEY, url)


class TestTheCommittedRegistry:
    def test_it_loads(self):
        assert len(load_registry(REAL_REGISTRY_PATH, ENVIRONMENT)) >= 4

    def test_every_collector_is_still_unprovisioned(self):
        # Honest by design: ids arrive from `scraper create`, which has not been run.
        # When it is, this test is the reminder to update the README's status table.
        registry = load_registry(REAL_REGISTRY_PATH, ENVIRONMENT)

        assert not any(collector.is_provisioned for collector in registry.all())

    def test_every_collector_has_at_least_one_url(self):
        registry = load_registry(REAL_REGISTRY_PATH, ENVIRONMENT)

        assert all(collector.urls for collector in registry.all())

    def test_every_referenced_prompt_file_exists(self):
        # A registry pointing at a missing prompt is a collector nobody can recreate.
        registry = load_registry(REAL_REGISTRY_PATH, ENVIRONMENT)
        collectors_dir = REAL_REGISTRY_PATH.parent

        for collector in registry.all():
            assert collector.prompt_file is not None, collector.key
            assert (collectors_dir / collector.prompt_file).is_file(), collector.key

    def test_every_prompt_fits_the_cli_description_cap(self):
        # `brightdata scraper create <url> <description>` rejects a description over
        # 500 characters. Every prompt here is passed as that argument, so a prompt
        # that grows past the cap makes provisioning impossible — and the CLI would
        # only say so after the call. Fail here instead, in milliseconds.
        registry = load_registry(REAL_REGISTRY_PATH, ENVIRONMENT)
        collectors_dir = REAL_REGISTRY_PATH.parent

        for collector in registry.all():
            assert collector.prompt_file is not None, collector.key
            prompt = (collectors_dir / collector.prompt_file).read_text(encoding="utf-8").strip()
            assert len(prompt) <= CREATE_DESCRIPTION_MAX_CHARS, (
                f"{collector.prompt_file} is {len(prompt)} chars"
            )

    def test_the_demo_collector_is_configured_with_both_fixture_urls(self):
        demo = load_registry(REAL_REGISTRY_PATH, ENVIRONMENT).get(DEMO_KEY)

        assert demo.urls == (BASELINE_URL, MUTATED_URL)
