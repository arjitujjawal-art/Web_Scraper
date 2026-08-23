"""The read side — every endpoint the map and the dashboard actually call.

These routes are the frontend's whole contract, so the assertions here are written
against the *shape* the frontend consumes: paging meta on lists, deterministic zone
ids for deep links, `total` counters so nobody has to guess whether more data
exists, and typed 422s on bad query values instead of a silently empty page.

The data is written straight through `SignalRepository` rather than through a
collector run. That keeps this module about serving and scoring: a fixture change
in `tests/fixtures/cli/` should not be able to break a paging test.

One scenario is shared by everything below, chosen so each read has something
interesting to say:

* **Delhi / AI-ML** — three distinct source types, so it is HIGH confidence and
  uncapped, and it outranks everything else;
* **Delhi / IoT** — the same story filed twice, so `signal_count` (2) and
  `deduplicated_count` (1) disagree and `evidence_count` shows why;
* **San Francisco / Quantum** — one source type, so it is LOW confidence and the
  concentration cap clamps it.
"""

import pytest
from app.domain.enums import SignalType, SourceType

from tests.conftest import DEMO_KEY, DISABLED_KEY, UNPROVISIONED_KEY
from tests.helpers import make_signal, store_signals

DELHI_AI = "delhi-ai-ml"
DELHI_IOT = "delhi-iot"
SF_QUANTUM = "san-francisco-quantum"


def scenario():
    """Five signals across three zones. Ages are in days, back from the frozen clock."""
    return (
        make_signal(
            signal_id="d1",
            city="Delhi",
            domain="AI/ML",
            source_type=SourceType.STARTUP_NEWSROOM,
            signal_type=SignalType.FACILITY_EXPANSION,
            age_days=1,
            title="Northline opens an applied AI research centre in Gurugram",
            area="Gurugram",
        ),
        make_signal(
            signal_id="d2",
            city="Delhi",
            domain="AI/ML",
            source_type=SourceType.UNIVERSITY_RESEARCH,
            signal_type=SignalType.RESEARCH_GRANT,
            age_days=4,
            title="IIT Delhi wins a national grant for federated learning",
        ),
        make_signal(
            signal_id="d3",
            city="Delhi",
            domain="AI/ML",
            source_type=SourceType.TECH_EVENT,
            signal_type=SignalType.TECH_EVENT,
            age_days=2,
            title="Machine learning practitioners summit announced for Okhla",
        ),
        # Two outlets, one lab. Same bin, one day apart, near-identical headlines.
        make_signal(
            signal_id="iot_first",
            city="Delhi",
            domain="IoT",
            source_type=SourceType.STARTUP_NEWSROOM,
            signal_type=SignalType.FACILITY_EXPANSION,
            age_days=4,
            title="Edge computing lab expands in Noida",
            area="Noida",
            evidence_urls=("https://first-outlet.test/noida-edge-lab",),
        ),
        make_signal(
            signal_id="iot_second",
            city="Delhi",
            domain="IoT",
            source_type=SourceType.STARTUP_NEWSROOM,
            signal_type=SignalType.FACILITY_EXPANSION,
            age_days=3,
            title="Edge computing lab expands in Noida",
            evidence_urls=("https://second-outlet.test/noida-edge-lab",),
        ),
        make_signal(
            signal_id="sf1",
            city="San Francisco",
            domain="Quantum",
            source_type=SourceType.UNIVERSITY_RESEARCH,
            signal_type=SignalType.RESEARCH_GRANT,
            age_days=10,
            title="Berkeley funds a quantum error correction programme",
            area="Mission Bay",
        ),
    )


@pytest.fixture
async def stored(client, app_instance):
    """The scenario, written to the database the running app is using."""
    signals = scenario()
    await store_signals(app_instance, *signals)
    return signals


async def get(client, path: str, **params: object) -> dict:
    response = await client.get(path, params=params or None)
    assert response.status_code == 200, response.text
    return response.json()


class TestHealth:
    async def test_health_reports_whether_the_demo_will_work(self, client, stored):
        body = await get(client, "/api/health")

        assert body["status"] == "ok"
        assert body["signals"] == 6
        assert body["collectors"] == 4
        assert body["collectors_provisioned"] == 3
        assert body["collectors_need_attention"] == 0
        assert body["active_jobs"] == 0
        assert body["latest_signal_at"] is not None

    async def test_an_empty_database_is_still_healthy(self, client):
        # A load balancer must not kill the process because nobody has run a
        # collector yet. The numbers say the data is empty; the status stays ok.
        body = await get(client, "/api/health")

        assert body["status"] == "ok"
        assert body["signals"] == 0
        assert body["latest_signal_at"] is None

    async def test_the_copilot_is_reported_as_off_without_a_key(self, client):
        # The partner's track is gated on configuration, not on code being present.
        assert (await get(client, "/api/health"))["copilot_enabled"] is False


class TestZoneList:
    async def test_zones_come_back_strongest_first(self, client, stored):
        body = await get(client, "/api/zones")

        assert body["total"] == 3
        assert [zone["zone_id"] for zone in body["items"]] == [DELHI_AI, DELHI_IOT, SF_QUANTUM]
        scores = [zone["score"] for zone in body["items"]]
        assert scores == sorted(scores, reverse=True)

    async def test_three_source_types_read_as_high_confidence(self, client, stored):
        zone = (await get(client, "/api/zones"))["items"][0]

        assert zone["zone_id"] == DELHI_AI
        assert zone["distinct_source_types"] == 3
        assert zone["confidence"] == "HIGH"
        assert zone["was_capped"] is False
        assert sorted(zone["signal_ids"]) == ["d1", "d2", "d3"]

    async def test_a_single_source_zone_is_capped_and_marked_low(self, client, stored):
        # The cap has no solution for one source, so the score is clamped to 60% and
        # the confidence label carries the caveat. Both are returned, because a
        # reduced score with no explanation looks like a bug.
        zones = {zone["zone_id"]: zone for zone in (await get(client, "/api/zones"))["items"]}

        for zone_id in (DELHI_IOT, SF_QUANTUM):
            assert zones[zone_id]["confidence"] == "LOW", zone_id
            assert zones[zone_id]["distinct_source_types"] == 1, zone_id
            assert zones[zone_id]["was_capped"] is True, zone_id

    async def test_the_breakdown_explains_the_score_it_sums_to(self, client, stored):
        zone = (await get(client, "/api/zones"))["items"][0]

        contributions = zone["contributions"]
        assert [item["source_type"] for item in contributions] == [
            "startup_newsroom",
            "university_research",
            "tech_event",
        ]
        # Every float is rounded independently for display, so the sum can differ
        # from the rounded score in the last place. The domain keeps the arithmetic
        # exact; the tolerance here is display precision, not slack in the model.
        assert sum(item["capped"] for item in contributions) == pytest.approx(
            zone["score"], abs=0.005
        )

    async def test_duplicate_reports_are_counted_once_but_still_shown(self, client, stored):
        zone = next(
            item
            for item in (await get(client, "/api/zones"))["items"]
            if item["zone_id"] == DELHI_IOT
        )

        assert zone["signal_count"] == 2
        assert zone["deduplicated_count"] == 1

    async def test_a_zone_gets_coordinates_without_a_geocoding_call(self, client, stored):
        for zone in (await get(client, "/api/zones"))["items"]:
            coordinates = zone["coordinates"]

            assert -90.0 <= coordinates["latitude"] <= 90.0, zone["zone_id"]
            assert -180.0 <= coordinates["longitude"] <= 180.0, zone["zone_id"]

    async def test_markers_for_one_city_do_not_stack(self, client, stored):
        delhi = [
            (zone["coordinates"]["latitude"], zone["coordinates"]["longitude"])
            for zone in (await get(client, "/api/zones", city="Delhi"))["items"]
        ]

        assert len(set(delhi)) == len(delhi)


class TestZoneFilters:
    async def test_a_city_filter_narrows_the_map(self, client, stored):
        body = await get(client, "/api/zones", city="Delhi")

        assert {zone["zone_id"] for zone in body["items"]} == {DELHI_AI, DELHI_IOT}

    async def test_a_domain_filter_narrows_the_map(self, client, stored):
        body = await get(client, "/api/zones", domain="AI/ML")

        assert [zone["zone_id"] for zone in body["items"]] == [DELHI_AI]

    async def test_filtering_cannot_change_a_score(self, client, stored):
        # Zones are independent bins, which is what makes it safe to push the filter
        # into SQL. If narrowing to one city moved its score, the map and the detail
        # page would disagree.
        unfiltered = next(
            zone
            for zone in (await get(client, "/api/zones"))["items"]
            if zone["zone_id"] == DELHI_AI
        )
        filtered = (await get(client, "/api/zones", city="Delhi", domain="AI/ML"))["items"][0]

        assert filtered["score"] == unfiltered["score"]

    async def test_min_score_declutters_without_deleting_anything(self, client, stored):
        loud = await get(client, "/api/zones", min_score=2.0)

        assert [zone["zone_id"] for zone in loud["items"]] == [DELHI_AI]
        assert (await get(client, "/api/zones"))["total"] == 3

    async def test_an_unknown_city_is_an_empty_map_not_an_error(self, client, stored):
        body = await get(client, "/api/zones", city="Atlantis")

        assert body["items"] == []
        assert body["total"] == 0

    async def test_a_negative_min_score_is_refused(self, client, stored):
        response = await client.get("/api/zones", params={"min_score": -1})

        assert response.status_code == 422
        assert response.json()["code"] == "validation_error"


class TestZoneDetail:
    async def test_a_zone_id_is_a_stable_deep_link(self, client, stored):
        body = await get(client, f"/api/zones/{DELHI_AI}")

        assert body["zone_id"] == DELHI_AI
        assert body["city"] == "Delhi"
        assert body["domain"] == "AI/ML"

    async def test_a_quiet_zone_still_opens_when_the_map_is_filtered_above_it(self, client, stored):
        # `min_score` is a display filter. A deep link must not 404 because someone
        # decluttered the map.
        assert (await get(client, "/api/zones", min_score=2.0))["total"] == 1

        assert (await get(client, f"/api/zones/{SF_QUANTUM}"))["zone_id"] == SF_QUANTUM

    async def test_an_unknown_zone_id_is_a_typed_404(self, client, stored):
        response = await client.get("/api/zones/pune-blockchain")

        assert response.status_code == 404
        assert response.json()["code"] == "zone_not_found"


class TestZoneEvidence:
    async def test_the_evidence_is_the_deduplicated_signals(self, client, stored):
        body = await get(client, f"/api/zones/{DELHI_AI}/signals")

        assert body["zone_id"] == DELHI_AI
        assert {signal["signal_id"] for signal in body["signals"]} == {"d1", "d2", "d3"}

    async def test_a_merged_signal_carries_the_outlets_it_was_merged_from(self, client, stored):
        # "Two outlets reported this — counted once." The merge keeps the earlier
        # report as the survivor, because being first is what the decay measures.
        body = await get(client, f"/api/zones/{DELHI_IOT}/signals")

        assert len(body["signals"]) == 1
        merged = body["signals"][0]
        assert merged["signal_id"] == "iot_first"
        assert merged["evidence_count"] == 2
        assert sorted(merged["evidence_urls"]) == [
            "https://first-outlet.test/noida-edge-lab",
            "https://second-outlet.test/noida-edge-lab",
        ]

    async def test_evidence_for_an_unknown_zone_is_a_404(self, client, stored):
        response = await client.get("/api/zones/pune-blockchain/signals")

        assert response.status_code == 404
        assert response.json()["code"] == "zone_not_found"


class TestSignalList:
    async def test_signals_are_newest_first_with_paging_meta(self, client, stored):
        body = await get(client, "/api/signals")

        assert body["meta"] == {"total": 6, "limit": 50, "offset": 0, "has_more": False}
        dates = [signal["date"] for signal in body["items"]]
        assert dates == sorted(dates, reverse=True)

    async def test_a_page_says_whether_more_exists(self, client, stored):
        first = await get(client, "/api/signals", limit=2)
        second = await get(client, "/api/signals", limit=2, offset=2)

        assert first["meta"]["has_more"] is True
        assert first["meta"]["total"] == 6
        assert len(second["items"]) == 2
        assert {signal["signal_id"] for signal in first["items"]}.isdisjoint(
            signal["signal_id"] for signal in second["items"]
        )

    async def test_the_last_page_says_there_is_no_more(self, client, stored):
        body = await get(client, "/api/signals", limit=2, offset=4)

        assert body["meta"]["has_more"] is False

    async def test_signals_can_be_narrowed_the_same_way_zones_can(self, client, stored):
        by_city = await get(client, "/api/signals", city="San Francisco")
        by_domain = await get(client, "/api/signals", domain="IoT")
        by_source = await get(client, "/api/signals", source_type="startup_newsroom")

        assert [signal["signal_id"] for signal in by_city["items"]] == ["sf1"]
        assert by_domain["meta"]["total"] == 2
        assert by_source["meta"]["total"] == 3

    async def test_the_signal_list_is_not_deduplicated(self, client, stored):
        # Zones dedupe; the evidence layer does not. Both reports stay browsable,
        # which is what lets someone check the merge rather than trust it.
        body = await get(client, "/api/signals", domain="IoT")

        assert {signal["signal_id"] for signal in body["items"]} == {"iot_first", "iot_second"}

    async def test_an_unknown_source_type_is_a_422_not_an_empty_page(self, client, stored):
        response = await client.get("/api/signals", params={"source_type": "podcast"})

        assert response.status_code == 422
        assert response.json()["code"] == "validation_error"

    async def test_an_oversized_page_is_refused(self, client, stored):
        response = await client.get("/api/signals", params={"limit": 5000})

        assert response.status_code == 422
        assert response.json()["code"] == "validation_error"


class TestSignalDetail:
    async def test_one_signal_by_id_for_a_citation_link(self, client, stored):
        body = await get(client, "/api/signals/d1")

        assert body["signal_id"] == "d1"
        assert body["city"] == "Delhi"
        assert body["area"] == "Gurugram"
        assert body["collector_key"] == "test_collector"

    async def test_an_unknown_signal_id_is_a_404_in_the_shared_envelope(self, client, stored):
        response = await client.get("/api/signals/does-not-exist")

        assert response.status_code == 404
        assert response.json()["code"] == "not_found"


class TestCollectorList:
    async def test_every_registered_collector_is_listed_including_the_broken_ones(self, client):
        # Hiding an unprovisioned collector would make the dashboard look complete
        # while the demo was one `PENDING` id away from failing.
        body = await get(client, "/api/collectors")

        assert body["total"] == 4
        keys = [item["key"] for item in body["items"]]
        assert keys[0] == DEMO_KEY
        assert {DISABLED_KEY, UNPROVISIONED_KEY} <= set(keys)

    async def test_a_collector_that_has_never_run_says_so(self, client):
        body = await get(client, f"/api/collectors/{DEMO_KEY}")

        assert body["health"] == "UNKNOWN"
        assert body["last_run_id"] is None
        assert body["last_fill_rate"] is None
        assert body["needs_attention"] is False

    async def test_configuration_is_visible_without_a_key(self, client):
        body = await get(client, f"/api/collectors/{DEMO_KEY}")

        assert body["collector_id"] == "c_mp3tuab31lswoxvpws"
        assert body["is_provisioned"] is True
        assert body["enabled"] is True
        assert len(body["urls"]) == 2
        assert body["required_fields"] == ["title", "date", "city", "domain"]

    async def test_an_unprovisioned_collector_is_flagged_not_hidden(self, client):
        body = await get(client, f"/api/collectors/{UNPROVISIONED_KEY}")

        assert body["is_provisioned"] is False
        assert body["collector_id"] == "PENDING"

    async def test_a_disabled_collector_is_flagged_not_hidden(self, client):
        assert (await get(client, f"/api/collectors/{DISABLED_KEY}"))["enabled"] is False


class TestRunHistory:
    async def test_run_history_is_empty_before_anything_runs(self, client):
        body = await get(client, "/api/collector-runs")

        assert body == {"items": [], "total": 0}

    async def test_an_unknown_filter_value_is_a_422(self, client):
        response = await client.get("/api/collector-runs", params={"action": "delete"})

        assert response.status_code == 422
        assert response.json()["code"] == "validation_error"
