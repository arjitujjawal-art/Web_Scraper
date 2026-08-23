"""One date parsing path for the whole application.

Two parsers drift apart; this module exists so that a change to date handling can
only be made in one place. Every returned datetime is timezone-aware UTC.

The critical rule: **an unparseable date is rejected, never defaulted to now.**
Defaulting to now would hand a stale record maximum freshness under the
exponential decay in `convergence`, which is the single worst failure mode this
scoring model has.
"""

import re
from datetime import UTC, date, datetime

# Berkeley prints no date line — the publication date lives in the article URL,
# e.g. https://news.berkeley.edu/2026/08/21/some-headline/
_URL_DATE = re.compile(r"/(?P<year>20\d{2})/(?P<month>\d{1,2})/(?P<day>\d{1,2})(?:/|$)")

# IIT Delhi news cards render a bare day/month pair: "20 / Aug".
_DAY_MONTH = re.compile(r"^(?P<day>\d{1,2})\s*/\s*(?P<month>[A-Za-z]{3,9})\.?$")

_EXPLICIT_FORMATS: tuple[str, ...] = (
    "%Y-%m-%d",
    "%Y/%m/%d",
    "%d-%m-%Y",
    "%d/%m/%Y",
    "%d %B %Y",
    "%d %b %Y",
    "%B %d, %Y",
    "%b %d, %Y",
    "%B %d %Y",
    "%b %d %Y",
)

# A day/month with no year is read as the most recent occurrence. Allow a little
# slack for events announced days ahead before rolling back a year.
_FUTURE_TOLERANCE_DAYS = 45


def _as_utc(value: datetime) -> datetime:
    """Attach UTC to a naive datetime, or convert an aware one."""
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _from_url(text: str) -> datetime | None:
    match = _URL_DATE.search(text)
    if match is None:
        return None
    try:
        return datetime(int(match["year"]), int(match["month"]), int(match["day"]), tzinfo=UTC)
    except ValueError:
        return None


def _month_number(name: str) -> int | None:
    """Resolve "Aug" or "August" to 8."""
    for fmt, token in (("%b", name[:3]), ("%B", name)):
        try:
            return datetime.strptime(token, fmt).replace(tzinfo=UTC).month
        except ValueError:
            continue
    return None


def _from_day_month(text: str, now: datetime) -> datetime | None:
    match = _DAY_MONTH.match(text)
    if match is None:
        return None
    month = _month_number(match["month"])
    if month is None:
        return None
    try:
        candidate = datetime(now.year, month, int(match["day"]), tzinfo=UTC)
    except ValueError:
        return None
    if (candidate - _as_utc(now)).days > _FUTURE_TOLERANCE_DAYS:
        candidate = candidate.replace(year=now.year - 1)
    return candidate


def _from_explicit_formats(text: str) -> datetime | None:
    for fmt in _EXPLICIT_FORMATS:
        try:
            return datetime.strptime(text, fmt).replace(tzinfo=UTC)
        except ValueError:
            continue
    return None


def parse_signal_date(value: object, now: datetime) -> datetime | None:
    """Parse any date shape the pipeline can encounter, or return None.

    Accepts, in order of attempt:
      * `datetime` and `date` — what SQLAlchemy hands back on re-read
      * ISO 8601 strings, including a trailing `Z`
      * a date embedded in a URL path (`/2026/08/21/`)
      * explicit formats such as `21 August 2026` or `Aug 21, 2026`
      * a bare `20 / Aug`, resolved against `now`

    Args:
        value: The raw value from a scraper row or the database.
        now: Reference time, injected so the year-inference branch is testable.

    Returns:
        A timezone-aware UTC datetime, or None when the value cannot be trusted.
    """
    if isinstance(value, datetime):
        return _as_utc(value)
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day, tzinfo=UTC)
    if not isinstance(value, str):
        return None

    text = value.strip()
    if not text:
        return None

    try:
        return _as_utc(datetime.fromisoformat(text.replace("Z", "+00:00")))
    except ValueError:
        pass

    return _from_url(text) or _from_explicit_formats(text) or _from_day_month(text, now)


def age_in_days(signal_date: datetime, now: datetime) -> float:
    """Age of a signal in days, floored at zero.

    Future-dated signals (a conference three weeks out) are treated as brand new
    rather than given a decay bonus above 1.0.
    """
    delta = _as_utc(now) - _as_utc(signal_date)
    return max(0.0, delta.total_seconds() / 86_400.0)
