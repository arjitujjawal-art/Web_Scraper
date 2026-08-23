"""Declarative base and the one custom column type this schema needs.

SQLite stores no timezone. Round-tripping a UTC datetime through it and getting a
naive one back is how a decay model quietly shifts by a few hours — or by a whole
day, once a local-time machine is involved. `UtcDateTime` makes the boundary
explicit: aware going in, aware coming out, always UTC.
"""

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import DateTime, Dialect, TypeDecorator
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Shared declarative base for every table."""


class UtcDateTime(TypeDecorator[datetime]):
    """A `DateTime` that refuses to lose the timezone.

    Naive values are rejected on write rather than assumed to be UTC: an assumption
    that is wrong once produces timestamps nobody can later untangle.
    """

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        """Convert to UTC on the way in, rejecting naive values."""
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError(
                "naive datetime reached the database; parse dates through "
                "app.domain.dates.parse_signal_date, which always returns UTC"
            )
        return value.astimezone(UTC)

    def process_result_value(self, value: Any, dialect: Dialect) -> datetime | None:
        """Re-attach UTC on the way out, since SQLite stores no offset.

        A non-datetime here means the driver's own result processor did not run, which
        would silently produce strings where the domain expects `datetime`. Raising is
        the only safe response: every comparison downstream would otherwise be wrong.
        """
        if value is None:
            return None
        if not isinstance(value, datetime):
            raise TypeError(f"expected a datetime from the database, got {type(value).__name__}")
        return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)
