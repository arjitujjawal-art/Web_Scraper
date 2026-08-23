"""The Signal Copilot: natural-language questions answered from the database.

Partner track. `docs/COPILOT_BRIEF.md` is the standalone version of this file's
rules; read that first if you are picking this up cold.

Three constraints define the design, and each one exists because the obvious
shortcut produces a demo that lies:

1. **No SQL and no scoring maths in this module.** `search_signals` is a thin
   adapter over `SignalService`; `get_emergence_score` is a thin adapter over
   `ZoneService`. If the Copilot needs a query that does not exist, the method is
   added to a repository and the REST API gains it too. That is what stops the chat
   answer and the map marker from drifting apart.
2. **Nothing is hardcoded.** An earlier draft answered every question with Pune,
   IoT and a fixed score of 8.42 because it held no session and called no tools.
   Here the session is injected, every number comes from a tool result, and a city
   the database has never heard of returns "no signals for that city" rather than a
   substituted one.
3. **Grounding is checked, not hoped for.** `CopilotAnswer.grounded` is False when
   no tool returned data, and the system prompt requires the model to say so. The
   tests assert an ungrounded answer never carries citations.

The Anthropic SDK sits behind a single callable (`Completer`), so the tests run the
whole tool loop against a stub with no API key.
"""

import json
import logging
from collections.abc import Awaitable, Callable, Mapping, Sequence
from dataclasses import dataclass, field
from typing import Any, cast

from app.config import Settings
from app.domain.enums import City, SourceType
from app.domain.models import NormalizedSignal
from app.services.errors import CopilotUnavailable
from app.services.signals import SignalService
from app.services.zones import ZoneService

logger = logging.getLogger(__name__)

# The model receives a compact projection of each signal, not the row. Fewer tokens,
# and nothing internal (raw payload paths, collector keys) leaks into a chat reply.
_SIGNAL_FIELDS = (
    "signal_id",
    "title",
    "date",
    "city",
    "domain",
    "source_type",
    "signal_type",
    "source_url",
    "evidence_count",
)

SYSTEM_PROMPT = """\
You are the Signal Atlas Copilot. You answer questions about emerging technology \
hubs using only the tools provided.

Rules:
- Never state a number you did not get from a tool result. Emergence scores come \
from get_emergence_score; signal counts come from search_signals.
- If a tool returns no data, say the data is not there. Do not substitute a \
different city, domain or time period, and do not estimate.
- Cite the signal_ids you used, inline, like [sig_abc123].
- Two cities are in scope: Delhi and San Francisco. If asked about another city, \
say it is not covered and name the ones that are.
- Be brief. Two or three sentences unless asked for detail.\
"""

# One assistant turn plus one tool result is two iterations; five leaves room for a
# follow-up query without letting a loop run away on someone's API bill.
_MAX_ITERATIONS_FLOOR = 1

Completer = Callable[[Sequence[Mapping[str, Any]], Sequence[Mapping[str, Any]]], Awaitable[Any]]


@dataclass(frozen=True, slots=True)
class CopilotAnswer:
    """What the chat route returns."""

    reply: str
    citations: tuple[NormalizedSignal, ...] = ()
    tools_used: tuple[str, ...] = ()
    grounded: bool = False


@dataclass(frozen=True, slots=True)
class ToolResult:
    """One tool call's outcome: what the model sees, and what it was grounded in."""

    payload: Mapping[str, Any] | Sequence[Mapping[str, Any]]
    signals: tuple[NormalizedSignal, ...] = ()
    grounded: bool = False

    def as_json(self) -> str:
        """Serialise the payload for the model's `tool_result` block."""
        return json.dumps(self.payload, default=str)


def _project(signal: NormalizedSignal) -> dict[str, Any]:
    """Compact a signal down to the fields a language model can use."""
    return {name: getattr(signal, name) for name in _SIGNAL_FIELDS}


@dataclass
class SignalTools:
    """The Copilot's two tools. Adapters only — no SQL, no arithmetic."""

    signals: SignalService
    zones: ZoneService
    _known_cities: tuple[str, ...] = field(default=(), init=False, repr=False)

    def definitions(self) -> list[dict[str, Any]]:
        """Anthropic tool schemas.

        `source_type` is enumerated from the domain enum rather than typed as a free
        string, so the model cannot invent a fifth source category.
        """
        return [
            {
                "name": "search_signals",
                "description": (
                    "Find early public signals (university research, incubator news, "
                    "startup newsroom posts, tech events) filtered by city, technology "
                    "domain and source type. Returns newest first."
                ),
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "city": {"type": "string", "description": "e.g. Delhi, San Francisco"},
                        "domain": {
                            "type": "string",
                            "description": "Technology domain, e.g. ai-ml, robotics, climate",
                        },
                        "source_type": {
                            "type": "string",
                            "enum": [member.value for member in SourceType],
                        },
                        "limit": {"type": "integer", "minimum": 1, "maximum": 50},
                    },
                    "required": [],
                },
            },
            {
                "name": "get_emergence_score",
                "description": (
                    "Emergence score for one city and technology domain, with its "
                    "confidence level and the per-source-type breakdown. Returns "
                    "found=false when no signals exist for that pair."
                ),
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "city": {"type": "string"},
                        "domain": {"type": "string"},
                    },
                    "required": ["city", "domain"],
                },
            },
        ]

    async def dispatch(self, name: str, arguments: Mapping[str, Any]) -> ToolResult:
        """Route a tool call, or report an unknown name back to the model."""
        if name == "search_signals":
            return await self._search(arguments)
        if name == "get_emergence_score":
            return await self._score(arguments)
        return ToolResult(payload={"error": f"unknown tool {name!r}"})

    # -- tools -------------------------------------------------------------

    async def _search(self, arguments: Mapping[str, Any]) -> ToolResult:
        city = await self._resolve_city(arguments.get("city"))
        if isinstance(city, ToolResult):
            return city

        page = await self.signals.search(
            city=city,
            domain=_text(arguments.get("domain")),
            source_type=_source_type(arguments.get("source_type")),
            limit=int(arguments.get("limit") or 10),
        )
        return ToolResult(
            payload={
                "total_matching": page.total,
                "returned": len(page.items),
                "signals": [_project(signal) for signal in page.items],
            },
            signals=page.items,
            grounded=bool(page.items),
        )

    async def _score(self, arguments: Mapping[str, Any]) -> ToolResult:
        city = await self._resolve_city(arguments.get("city"))
        if isinstance(city, ToolResult):
            return city
        domain = _text(arguments.get("domain"))
        if not city or not domain:
            return ToolResult(payload={"error": "city and domain are both required"})

        zone = await self.zones.score_for(city, domain)
        if zone is None:
            return ToolResult(
                payload={
                    "found": False,
                    "reason": f"no signals stored for {city} / {domain}",
                    "known_domains": list(await self.zones.known_domains()),
                }
            )

        return ToolResult(
            payload={
                "found": True,
                "zone_id": zone.zone_id,
                "city": zone.city,
                "domain": zone.domain,
                # Rounded here only because a chat reply reading "8.4213600000001"
                # looks broken; the stored arithmetic stays exact.
                "score": round(zone.score, 2),
                "confidence": str(zone.confidence),
                "signal_count": zone.signal_count,
                "deduplicated_count": zone.deduplicated_count,
                "distinct_source_types": zone.distinct_source_types,
                "was_capped": zone.was_capped,
                "contributions": [
                    {
                        "source_type": str(contribution.source_type),
                        "score": round(contribution.capped, 2),
                        "was_capped": contribution.was_capped,
                    }
                    for contribution in zone.contributions
                ],
            },
            grounded=True,
        )

    # -- internals ---------------------------------------------------------

    async def _resolve_city(self, requested: object) -> str | ToolResult | None:
        """Accept a city only if the data actually contains it.

        Checked against the database, not a hardcoded list, and returned to the model
        as an error payload naming the cities that exist. This is the specific guard
        against the failure mode where every question was answered about one city.
        """
        text = _text(requested)
        if not text:
            return None

        if not self._known_cities:
            stored = await self.signals.known_cities()
            self._known_cities = stored or tuple(member.value for member in City)

        match = next(
            (city for city in self._known_cities if city.casefold() == text.casefold()), None
        )
        if match is None:
            return ToolResult(
                payload={
                    "error": f"no signals for city {text!r}",
                    "known_cities": list(self._known_cities),
                }
            )
        return match


def _text(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _source_type(value: object) -> SourceType | None:
    """Parse a source type, ignoring an unrecognised one rather than failing.

    A model that guesses `"news"` should get an unfiltered answer it can narrow,
    not a tool error it will apologise for.
    """
    text = _text(value)
    if not text:
        return None
    try:
        return SourceType(text)
    except ValueError:
        logger.info("copilot.unknown_source_type", extra={"value": text})
        return None


class CopilotService:
    """Runs the tool-use loop and returns a grounded answer."""

    def __init__(
        self,
        *,
        tools: SignalTools,
        settings: Settings,
        completer: Completer | None = None,
    ) -> None:
        self._tools = tools
        self._settings = settings
        self._completer = completer

    async def answer(
        self,
        message: str,
        history: Sequence[Mapping[str, str]] = (),
    ) -> CopilotAnswer:
        """Answer one question, calling tools until the model stops asking.

        History arrives from the client — this service holds no session state, so
        there is nothing to expire and nothing to leak between users.
        """
        complete = self._completer or self._default_completer()
        definitions = self._tools.definitions()

        conversation: list[dict[str, Any]] = [
            {"role": turn["role"], "content": turn["content"]}
            for turn in history
            if turn.get("role") in {"user", "assistant"} and turn.get("content")
        ]
        conversation.append({"role": "user", "content": message})

        citations: list[NormalizedSignal] = []
        used: list[str] = []
        grounded = False
        reply = ""

        for _ in range(max(_MAX_ITERATIONS_FLOOR, self._settings.copilot_max_tool_iterations)):
            response = await complete(conversation, definitions)
            text, calls = _split_response(response)
            if text:
                reply = text
            if not calls:
                break

            conversation.append({"role": "assistant", "content": _content_of(response)})
            results: list[dict[str, Any]] = []
            for call in calls:
                outcome = await self._tools.dispatch(call.name, call.arguments)
                used.append(call.name)
                citations.extend(outcome.signals)
                grounded = grounded or outcome.grounded
                results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": call.call_id,
                        "content": outcome.as_json(),
                    }
                )
            conversation.append({"role": "user", "content": results})
        else:
            # Loop exhausted with the model still calling tools. Say so rather than
            # returning the last partial sentence as if it were an answer.
            logger.warning("copilot.iteration_limit", extra={"tools_used": used})
            reply = reply or (
                "I could not finish looking that up. Try asking about one city and "
                "one technology domain."
            )

        logger.info(
            "copilot.answered",
            extra={"tools_used": used, "grounded": grounded, "citations": len(citations)},
        )
        return CopilotAnswer(
            reply=reply or "I do not have data to answer that.",
            citations=_unique(citations),
            tools_used=tuple(dict.fromkeys(used)),
            grounded=grounded,
        )

    def _default_completer(self) -> Completer:
        """Build the real Anthropic completer, or refuse clearly.

        The SDK is imported here rather than at module scope so the rest of the
        application — and the whole test suite — runs without the package or a key.
        """
        key = self._settings.anthropic_api_key.strip()
        if not key:
            raise CopilotUnavailable(
                "ANTHROPIC_API_KEY is not set; the Signal Copilot is disabled. "
                "Every other endpoint works without it."
            )

        from anthropic import AsyncAnthropic  # noqa: PLC0415 — optional dependency

        client = AsyncAnthropic(api_key=key)
        model = self._settings.copilot_model

        async def complete(
            conversation: Sequence[Mapping[str, Any]],
            definitions: Sequence[Mapping[str, Any]],
        ) -> Any:
            # The `Completer` signature is deliberately plain mappings, so tests can
            # supply a stub without importing the SDK's TypedDicts. Casting here keeps
            # that dependency inversion instead of leaking `MessageParam` upwards.
            return await client.messages.create(
                model=model,
                max_tokens=1024,
                system=SYSTEM_PROMPT,
                messages=cast("Any", list(conversation)),
                tools=cast("Any", list(definitions)),
            )

        return complete


@dataclass(frozen=True, slots=True)
class _ToolCall:
    call_id: str
    name: str
    arguments: Mapping[str, Any]


def _split_response(response: Any) -> tuple[str, tuple[_ToolCall, ...]]:
    """Pull text and tool calls out of a Messages API response.

    Tolerant by design: blocks are read by attribute with `getattr`, so both the SDK's
    objects and a test's simple stand-ins work without an adapter class.
    """
    text_parts: list[str] = []
    calls: list[_ToolCall] = []

    for block in getattr(response, "content", ()) or ():
        kind = getattr(block, "type", None)
        if kind == "text":
            text_parts.append(str(getattr(block, "text", "")))
        elif kind == "tool_use":
            calls.append(
                _ToolCall(
                    call_id=str(getattr(block, "id", "")),
                    name=str(getattr(block, "name", "")),
                    arguments=getattr(block, "input", {}) or {},
                )
            )

    return "\n\n".join(part for part in text_parts if part).strip(), tuple(calls)


def _content_of(response: Any) -> Any:
    """The assistant turn to echo back, preserving tool_use blocks verbatim."""
    return getattr(response, "content", [])


def _unique(signals: Sequence[NormalizedSignal]) -> tuple[NormalizedSignal, ...]:
    """Deduplicate citations by id, keeping first-seen order."""
    seen: dict[str, NormalizedSignal] = {}
    for signal in signals:
        seen.setdefault(signal.signal_id, signal)
    return tuple(seen.values())
