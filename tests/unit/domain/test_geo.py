"""Location resolution and marker placement, with no geocoding service involved.

Determinism is the requirement being tested: the same input must produce the same
coordinates on every run and after every restart, because the map is what judges
look at.
"""

import pytest
from app.domain.enums import City
from app.domain.geo import (
    AREAS,
    CITY_CENTRES,
    resolve_location,
    supported_cities,
    zone_coordinates,
)


class TestResolveLocation:
    @pytest.mark.parametrize(
        ("raw", "city", "area"),
        [
            ("Gurugram, Haryana", City.DELHI, "Gurugram"),
            ("Gurgaon", City.DELHI, "Gurugram"),
            ("Sector 62, Noida", City.DELHI, "Noida"),
            ("IIT Delhi", City.DELHI, "Hauz Khas"),
            ("Okhla Industrial Area, New Delhi", City.DELHI, "Okhla"),
            ("Soma", City.SAN_FRANCISCO, "SoMa"),
            ("UC Berkeley", City.SAN_FRANCISCO, "Berkeley"),
            ("Santa Clara, CA", City.SAN_FRANCISCO, "Santa Clara"),
        ],
    )
    def test_a_named_locality_resolves_to_its_area(self, raw, city, area):
        resolved = resolve_location(raw)

        assert resolved is not None
        assert resolved.city is city
        assert resolved.area == area

    def test_the_longer_area_name_wins(self):
        resolved = resolve_location("Greater Noida")

        assert resolved is not None
        assert resolved.area == "Greater Noida"

    @pytest.mark.parametrize(
        ("raw", "city"),
        [
            ("New Delhi", City.DELHI),
            ("Delhi NCR", City.DELHI),
            ("San Francisco", City.SAN_FRANCISCO),
            ("Bay Area", City.SAN_FRANCISCO),
            ("Silicon Valley", City.SAN_FRANCISCO),
        ],
    )
    def test_a_bare_city_resolves_without_an_area(self, raw, city):
        resolved = resolve_location(raw)

        assert resolved is not None
        assert resolved.city is city
        assert resolved.area is None
        assert resolved.coordinates == CITY_CENTRES[city]

    @pytest.mark.parametrize("raw", ["Hong Kong", "Bengaluru", "Pune", "Online", "", "   ", None])
    def test_unsupported_locations_resolve_to_nothing(self, raw):
        # Rejecting is the point: a mislocated marker is worse than a missing one.
        assert resolve_location(raw) is None

    def test_areas_are_checked_before_cities(self):
        # "Gurugram, Delhi NCR" names both; the locality is the more useful answer.
        resolved = resolve_location("Gurugram, Delhi NCR")

        assert resolved is not None
        assert resolved.area == "Gurugram"
        assert resolved.coordinates != CITY_CENTRES[City.DELHI]

    def test_every_configured_area_resolves_to_itself(self):
        for area in AREAS:
            resolved = resolve_location(area.name)

            assert resolved is not None, area.name
            assert resolved.city is area.city
            assert resolved.coordinates == area.coordinates


class TestZoneCoordinates:
    def test_a_known_area_uses_its_exact_point(self):
        coordinates = zone_coordinates("Delhi", "IoT", "Gurugram")

        assert coordinates.latitude == pytest.approx(28.4595)
        assert coordinates.longitude == pytest.approx(77.0266)

    def test_an_unknown_area_name_falls_back_to_the_city_ring(self):
        coordinates = zone_coordinates("Delhi", "IoT", "Atlantis")

        assert coordinates == zone_coordinates("Delhi", "IoT")

    def test_placement_is_stable_across_calls(self):
        assert zone_coordinates("Delhi", "AI/ML") == zone_coordinates("Delhi", "AI/ML")

    def test_domains_in_one_city_do_not_stack_on_the_same_pin(self):
        domains = ["AI/ML", "IoT", "Robotics", "Biotech", "Quantum", "Fintech"]

        points = {zone_coordinates("Delhi", domain) for domain in domains}

        assert len(points) == len(domains)

    def test_the_marker_stays_near_the_city_centre(self):
        centre = CITY_CENTRES[City.SAN_FRANCISCO]

        coordinates = zone_coordinates("San Francisco", "Robotics")

        assert abs(coordinates.latitude - centre.latitude) < 0.1
        assert abs(coordinates.longitude - centre.longitude) < 0.2


class TestSupportedCities:
    def test_the_mvp_covers_exactly_two_cities(self):
        assert supported_cities() == ("Delhi", "San Francisco")
