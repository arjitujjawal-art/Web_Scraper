"""The services layer's single clock.

`datetime.now()` scattered through a codebase is untestable and, worse, invisible:
nothing in a signature says the result depends on when it ran. Every service takes
`clock` as a constructor argument defaulting to `utcnow`, so a test freezes time by
passing `fixed_clock(...)`.

`app/domain/` does not import this. A pure function that reads a clock is not
pure, so the domain takes `now` as an explicit parameter instead.
"""

from collections.abc import Callable
from datetime import UTC, datetime

Clock = Callable[[], datetime]


def utcnow() -> datetime:
    """Current time, always timezone-aware UTC."""
    return datetime.now(UTC)


def fixed_clock(moment: datetime) -> Clock:
    """A clock frozen at `moment`, for tests and reproducible seeding."""
    return lambda: moment
