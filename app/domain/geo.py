"""Location resolution without a geocoding service.

A static registry beats an API call here for three reasons: no key to leak, no
network in the unit suite, and identical coordinates on every run — which matters
because the map is the thing judges look at.

Scope is Delhi/NCR and the San Francisco Bay Area. Anything that does not resolve
to one of those is rejected by the normalizer rather than pinned to a guess; a
mislocated marker is worse than a missing one.
"""

import hashlib
import math
import re
from collections.abc import Mapping
from dataclasses import dataclass

from app.domain.enums import City
from app.domain.models import Coordinates

# How far a city-level (area-unknown) zone marker is nudged from the city centre,
# in degrees. ~0.055 deg is roughly 6 km — enough to fan markers apart visibly
# without implying a precision the data does not have.
_ZONE_MARKER_RADIUS_DEG = 0.055


@dataclass(frozen=True, slots=True)
class Area:
    """A named sub-city locality with fixed coordinates."""

    name: str
    city: City
    coordinates: Coordinates
    aliases: tuple[str, ...] = ()


@dataclass(frozen=True, slots=True)
class ResolvedLocation:
    """Outcome of resolving a free-text location string."""

    city: City
    coordinates: Coordinates
    area: str | None = None


CITY_CENTRES: Mapping[City, Coordinates] = {
    City.DELHI: Coordinates(28.6139, 77.2090),
    City.SAN_FRANCISCO: Coordinates(37.7749, -122.4194),
}

CITY_ALIASES: Mapping[City, tuple[str, ...]] = {
    City.DELHI: ("delhi", "new delhi", "ncr", "delhi ncr", "national capital region"),
    City.SAN_FRANCISCO: (
        "san francisco",
        "sf",
        "san francisco bay area",
        "bay area",
        "silicon valley",
    ),
}

# Localities carry the spatial interest. Eventbrite in particular returns venue
# localities ("Soma", "Mayur Vihar Phase 1", "Gurugram", "Santa Clara"), which is
# what turns a two-pin map into a real one.
AREAS: tuple[Area, ...] = (
    # --- Delhi / NCR ---------------------------------------------------------
    Area("Connaught Place", City.DELHI, Coordinates(28.6315, 77.2167), ("cp",)),
    Area("Hauz Khas", City.DELHI, Coordinates(28.5494, 77.2001), ("iit delhi", "iit-delhi")),
    Area("Okhla", City.DELHI, Coordinates(28.5355, 77.2731), ("okhla industrial area",)),
    Area("Nehru Place", City.DELHI, Coordinates(28.5494, 77.2506)),
    Area("Dwarka", City.DELHI, Coordinates(28.5921, 77.0460)),
    Area("Rohini", City.DELHI, Coordinates(28.7495, 77.0565)),
    Area("Mayur Vihar", City.DELHI, Coordinates(28.6096, 77.2951)),
    Area("Saket", City.DELHI, Coordinates(28.5225, 77.2066)),
    Area("Aerocity", City.DELHI, Coordinates(28.5535, 77.1200)),
    Area("Gurugram", City.DELHI, Coordinates(28.4595, 77.0266), ("gurgaon",)),
    Area("Cyber City", City.DELHI, Coordinates(28.4949, 77.0895), ("dlf cyber city", "cyberhub")),
    Area("Noida", City.DELHI, Coordinates(28.5355, 77.3910)),
    Area("Greater Noida", City.DELHI, Coordinates(28.4744, 77.5040)),
    Area("Faridabad", City.DELHI, Coordinates(28.4089, 77.3178)),
    Area("Ghaziabad", City.DELHI, Coordinates(28.6692, 77.4538)),
    # --- San Francisco Bay Area ---------------------------------------------
    Area("SoMa", City.SAN_FRANCISCO, Coordinates(37.7785, -122.4056), ("south of market",)),
    Area("Mission Bay", City.SAN_FRANCISCO, Coordinates(37.7706, -122.3893)),
    Area("Financial District", City.SAN_FRANCISCO, Coordinates(37.7946, -122.3999), ("fidi",)),
    Area("Mission District", City.SAN_FRANCISCO, Coordinates(37.7599, -122.4148), ("the mission",)),
    Area("Palo Alto", City.SAN_FRANCISCO, Coordinates(37.4419, -122.1430), ("stanford",)),
    Area("Mountain View", City.SAN_FRANCISCO, Coordinates(37.3861, -122.0839)),
    Area("Santa Clara", City.SAN_FRANCISCO, Coordinates(37.3541, -121.9552)),
    Area("San Jose", City.SAN_FRANCISCO, Coordinates(37.3382, -121.8863)),
    Area("Berkeley", City.SAN_FRANCISCO, Coordinates(37.8715, -122.2730), ("uc berkeley",)),
    Area("Oakland", City.SAN_FRANCISCO, Coordinates(37.8044, -122.2712)),
    Area("Menlo Park", City.SAN_FRANCISCO, Coordinates(37.4530, -122.1817)),
    Area("Sunnyvale", City.SAN_FRANCISCO, Coordinates(37.3688, -122.0363)),
    Area("Fremont", City.SAN_FRANCISCO, Coordinates(37.5485, -121.9886)),
    Area("Redwood City", City.SAN_FRANCISCO, Coordinates(37.4852, -122.2364)),
)

_WORD_BOUNDARY_SAFE = re.compile(r"[^a-z0-9]+")


def _canonical(text: str) -> str:
    """Lowercase and collapse punctuation so "Gurugram, HR" matches "gurugram"."""
    return _WORD_BOUNDARY_SAFE.sub(" ", text.casefold()).strip()


def _contains_term(haystack: str, term: str) -> bool:
    """Whole-term containment on canonical text.

    Substring matching alone would let "Fremont" match inside an unrelated word;
    padding both sides with spaces keeps it to whole terms without a regex per call.
    """
    return f" {term} " in f" {haystack} "


def resolve_location(raw: str | None) -> ResolvedLocation | None:
    """Resolve free text to a supported city, and a locality when one is named.

    Areas are checked before cities so that "Gurugram, Delhi NCR" resolves to the
    Gurugram point rather than the Delhi centroid. Longer area names are tried
    first so "Greater Noida" is not swallowed by "Noida".

    Returns None when the text names no supported location — the caller is
    expected to reject the record.
    """
    if not raw or not raw.strip():
        return None

    text = _canonical(raw)

    for area in sorted(AREAS, key=lambda a: -len(a.name)):
        for term in (area.name, *area.aliases):
            if _contains_term(text, _canonical(term)):
                return ResolvedLocation(
                    city=area.city, coordinates=area.coordinates, area=area.name
                )

    for city, aliases in CITY_ALIASES.items():
        for alias in sorted(aliases, key=len, reverse=True):
            if _contains_term(text, _canonical(alias)):
                return ResolvedLocation(city=city, coordinates=CITY_CENTRES[city])

    return None


def _stable_angle(seed: str) -> float:
    """Map a string to a fixed angle in radians.

    Python's builtin `hash` is salted per process, so it cannot be used: markers
    would jump between server restarts. A digest keeps the layout stable forever.
    """
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    bucket = int.from_bytes(digest[:4], "big") % 360
    return math.radians(bucket)


def zone_coordinates(city: str, domain: str, area: str | None = None) -> Coordinates:
    """Pick the marker position for a (city, domain) zone.

    When the zone's signals name a locality, use it. Otherwise fan the zone around
    the city centre on a fixed radius, at an angle derived from the domain name, so
    that Delhi's ten domain zones do not stack into one unclickable pin.
    """
    if area is not None:
        for candidate in AREAS:
            if candidate.name == area:
                return candidate.coordinates

    resolved = resolve_location(city)
    centre = resolved.coordinates if resolved else CITY_CENTRES[City.DELHI]

    angle = _stable_angle(f"{city}:{domain}")
    # Longitude degrees shrink with latitude; correcting keeps the ring circular
    # on screen instead of squashed.
    lat_scale = max(0.1, math.cos(math.radians(centre.latitude)))
    offset_lat = _ZONE_MARKER_RADIUS_DEG * math.sin(angle)
    offset_lng = (_ZONE_MARKER_RADIUS_DEG / lat_scale) * math.cos(angle)
    return Coordinates(
        latitude=round(centre.latitude + offset_lat, 6),
        longitude=round(centre.longitude + offset_lng, 6),
    )


def supported_cities() -> tuple[str, ...]:
    """The canonical city names the MVP covers."""
    return tuple(city.value for city in City)
