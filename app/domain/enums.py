"""Closed vocabularies shared by the whole application.

These are the only strings allowed to cross layer boundaries for these concepts.
Anything arriving from a scraper payload is mapped onto one of these values by
`app.domain.normalizer`, or the record is rejected.
"""

from enum import StrEnum


class SourceType(StrEnum):
    """The four locked source categories.

    Kept deliberately small: four collectors maintained well beat six maintained
    badly over a seven-day build.
    """

    STARTUP_NEWSROOM = "startup_newsroom"
    UNIVERSITY_RESEARCH = "university_research"
    INCUBATOR_NEWS = "incubator_news"
    TECH_EVENT = "tech_event"


class SignalType(StrEnum):
    """What kind of real-world event a signal represents.

    Drives the static weight in the emergence score: a new lab is stronger
    evidence of an emerging hub than a meetup.
    """

    FACILITY_EXPANSION = "facility_expansion"
    RESEARCH_GRANT = "research_grant"
    TECH_EVENT = "tech_event"


class CollectorHealth(StrEnum):
    """Lifecycle of a collector as observed through its runs.

    The transitions a judge walks through in the demo are
    HEALTHY -> DEGRADED -> HEALING_REVIEW -> HEALED -> HEALTHY.
    """

    HEALTHY = "HEALTHY"
    DEGRADED = "DEGRADED"
    HEALING_REVIEW = "HEALING_REVIEW"
    HEALED = "HEALED"
    FAILED = "FAILED"
    UNKNOWN = "UNKNOWN"


class RunStatus(StrEnum):
    """Lifecycle of a single asynchronous CLI job."""

    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"

    @property
    def is_terminal(self) -> bool:
        """Whether a poller can stop asking."""
        return self in {RunStatus.SUCCEEDED, RunStatus.FAILED}


class CollectorAction(StrEnum):
    """Which CLI operation a job row represents.

    Runs, heals and approvals share a table because they share a lifecycle —
    queued, running, terminal — and the frontend polls all three through the same
    endpoint. One table with an action column beats three near-identical ones.
    """

    RUN = "run"
    HEAL = "heal"
    APPROVE = "approve"


class Confidence(StrEnum):
    """How much independent corroboration a zone's score rests on.

    Derived from the number of distinct source types contributing, so the map can
    visually separate genuine convergence from one prolific source.
    """

    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class City(StrEnum):
    """Canonical city names for the MVP.

    Scope is two metros by design — a sparse map reads as a broken product, and
    two well-covered metros look far better than ten empty ones.
    """

    DELHI = "Delhi"
    SAN_FRANCISCO = "San Francisco"
