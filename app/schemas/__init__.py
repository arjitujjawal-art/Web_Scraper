"""Request and response models — the only description of this API's wire format.

Nothing here contains logic. Models validate shape and range, round floats for
display, and stop. Every field a client can send is bounded, and every admin body
is `extra="forbid"` so a typo'd field is a 422 rather than a silently ignored
instruction.

Import rule, enforced by `lint-imports`: this package may import `app.domain`
(for enums) and nothing else from the application. Routes convert rows and
dataclasses with `model_validate`, which is why no ORM type ever appears here.
"""

from app.schemas.chat import ChatCitation, ChatOut, ChatRequest, ChatTurn
from app.schemas.collectors import (
    HEAL_PROMPT_MAX_CHARS,
    CollectorListOut,
    CollectorOut,
    CollectorRunListOut,
    CollectorRunOut,
    HealRequest,
    RunReportOut,
    RunRequest,
)
from app.schemas.common import Acknowledgement, ApiModel, ErrorResponse, PageMeta
from app.schemas.health import HealthOut
from app.schemas.signals import SignalListOut, SignalOut
from app.schemas.zones import (
    CoordinatesOut,
    SourceContributionOut,
    ZoneListOut,
    ZoneOut,
    ZoneSignalsOut,
)

__all__ = [
    "HEAL_PROMPT_MAX_CHARS",
    "Acknowledgement",
    "ApiModel",
    "ChatCitation",
    "ChatOut",
    "ChatRequest",
    "ChatTurn",
    "CollectorListOut",
    "CollectorOut",
    "CollectorRunListOut",
    "CollectorRunOut",
    "CoordinatesOut",
    "ErrorResponse",
    "HealRequest",
    "HealthOut",
    "PageMeta",
    "RunReportOut",
    "RunRequest",
    "SignalListOut",
    "SignalOut",
    "SourceContributionOut",
    "ZoneListOut",
    "ZoneOut",
    "ZoneSignalsOut",
]
