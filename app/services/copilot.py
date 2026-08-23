"""The Signal Copilot: natural-language questions answered from the database.

Supports multi-turn tool calling across predictive emergence signals, active job listings,
and Bright Data scraper fleet operations.
"""

import json
import logging
import os
from collections.abc import Awaitable, Callable, Mapping, Sequence
from dataclasses import dataclass, field
from typing import Any, cast

from app.config import Settings
from app.domain.enums import City, CollectorHealth, SourceType
from app.domain.models import JobPosting, NormalizedSignal
from app.services.collectors import CollectorService
from app.services.errors import CopilotUnavailable
from app.services.job_postings import JobService
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

_JOB_FIELDS = (
    "job_id",
    "title",
    "company",
    "city",
    "domain",
    "job_type",
    "salary_range",
    "summary",
    "skills",
    "source_url",
    "source",
)

SYSTEM_PROMPT = """\
You are the Signal Atlas Copilot, an AI assistant for emerging technology ecosystems \
and web scraping operations.

You have access to 4 specialized tools:
1. get_emergence_score: Returns exact mathematical emergence scores, confidence levels, \
velocities, and source contribution breakdowns for a city and technology domain.
2. search_signals: Finds early predictive signals (university research labs, grant awards, \
incubator cohorts, startup newsrooms, tech events).
3. search_active_jobs: Searches active job board vacancies (LinkedIn, tech boards) for open \
roles, hiring companies, salary ranges, and skills.
4. get_scraper_fleet_health: Returns operational health of Bright Data collectors, fill \
rates, degraded statuses, and self-healing instructions.

Key Guidelines:
- How to Use the Platform / Website Navigation: If users ask how to use the website or \
what features are available, explain the core areas:
  1. Interactive Map: Click on any city cluster/pin (Delhi NCR or San Francisco Bay Area) to \
view live emergence scores, confidence levels, and source breakdowns. Use the top filters \
to filter by domain (e.g. AI/ML, Robotics, GreenTech) or minimum score.
  2. Emerging Signals Feed: Browse verified leading indicators (university grants, lab \
launches, incubator cohorts) with deduplication and evidence citations.
  3. Active Jobs Explorer: Search active LinkedIn tech vacancies to compare lagging hiring \
demand against leading research signals.
  4. Scraper Fleet Operations: Monitor Bright Data collector health, run history, and \
trigger self-healing for degraded scrapers.
  5. Copilot Assistant: Ask questions about trends, scores, jobs, or scraping operations.
- Predictive Signals vs. Active Jobs: University research and incubators are leading emergence \
indicators (what is emerging); job vacancies are lagging indicators (formal hiring). Explain \
this distinction when helpful.
- Anti-Hallucination: Never state a number, score, or job vacancy you did not obtain from a \
tool result. If a tool returns no data, state clearly that no records exist in the database.
- Citations: When referencing predictive signals, cite signal IDs inline like [sig_abc123].
- Scope: Primary coverage is Delhi (NCR) and San Francisco (Bay Area). If asked about an \
uncovered city, state it is not covered and name the supported regions.
- Self-Healing Scraper Instructions: If a collector is DEGRADED (fill rate < 80%), guide the \
user to run 'bdata scraper heal <id> "<feedback>"', verify the diffs, and deploy with \
'bdata scraper approve <id>'.
- Be concise, accurate, and structured in Markdown.
"""

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


def _project_job(job: JobPosting) -> dict[str, Any]:
    """Compact a job posting down to the fields a language model can use."""
    return {name: getattr(job, name) for name in _JOB_FIELDS}


@dataclass
class SignalTools:
    """The Copilot's tool adapters. No SQL, no raw scoring arithmetic."""

    signals: SignalService
    zones: ZoneService
    jobs: JobService | None = None
    collectors: CollectorService | None = None
    _known_cities: tuple[str, ...] = field(default=(), init=False, repr=False)

    def definitions(self) -> list[dict[str, Any]]:
        """Anthropic / OpenAI standard tool schemas."""
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
                            "description": (
                                "Technology domain, e.g. AI/ML, Robotics, GreenTech, Fintech"
                            ),
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
            {
                "name": "search_active_jobs",
                "description": (
                    "Search traditional active job board vacancies (LinkedIn, tech boards) "
                    "for open positions, hiring companies, salary ranges, and required skills."
                ),
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "city": {
                            "type": "string",
                            "description": ("e.g. Delhi, San Francisco, Gurugram, Noida, Berkeley"),
                        },
                        "keyword": {
                            "type": "string",
                            "description": (
                                "Role title, skill, or company (e.g. Python, ML Engineer, InnoAI)"
                            ),
                        },
                        "domain": {
                            "type": "string",
                            "description": "Domain, e.g. AI/ML, Robotics, GreenTech, Fintech",
                        },
                        "limit": {"type": "integer", "minimum": 1, "maximum": 50},
                    },
                    "required": [],
                },
            },
            {
                "name": "get_scraper_fleet_health",
                "description": (
                    "Retrieve the operational status of all Bright Data scrapers in the fleet, "
                    "including fill rates, degraded collectors, and self-healing instructions."
                ),
                "input_schema": {
                    "type": "object",
                    "properties": {},
                    "required": [],
                },
            },
        ]

    async def dispatch(self, name: str, arguments: Mapping[str, Any]) -> ToolResult:
        """Route a tool call, or report an unknown name back to the model."""
        if name == "search_signals":
            return await self._search(arguments)
        if name == "get_emergence_score":
            return await self._score(arguments)
        if name == "search_active_jobs":
            return await self._search_jobs(arguments)
        if name == "get_scraper_fleet_health":
            return await self._fleet_health()
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

    async def _search_jobs(self, arguments: Mapping[str, Any]) -> ToolResult:
        if not self.jobs:
            return ToolResult(payload={"total_matching": 0, "returned": 0, "jobs": []})

        city_raw = arguments.get("city")
        keyword = _text(arguments.get("keyword"))
        domain = _text(arguments.get("domain"))
        limit = int(arguments.get("limit") or 10)

        city = None
        if city_raw:
            resolved = await self._resolve_city(city_raw)
            if isinstance(resolved, ToolResult):
                return resolved
            city = resolved

        jobs = await self.jobs.search(
            city=city,
            keyword=keyword,
            domain=domain,
            limit=limit,
        )
        total = await self.jobs.count(city=city, domain=domain)
        return ToolResult(
            payload={
                "total_matching": max(total, len(jobs)),
                "returned": len(jobs),
                "jobs": [_project_job(job) for job in jobs],
            },
            grounded=bool(jobs),
        )

    async def _fleet_health(self) -> ToolResult:
        if not self.collectors:
            return ToolResult(
                payload={
                    "total_collectors": 0,
                    "status": "online",
                    "healing_guide": (
                        "Run 'bdata scraper heal <id> \"<feedback>\"' to repair broken selectors."
                    ),
                },
                grounded=True,
            )
        statuses = await self.collectors.list_statuses()
        healthy_count = sum(1 for s in statuses if s.health == CollectorHealth.HEALTHY)
        degraded_count = sum(1 for s in statuses if s.health == CollectorHealth.DEGRADED)
        awaiting_count = sum(1 for s in statuses if s.awaiting_approval)

        return ToolResult(
            payload={
                "total_collectors": len(statuses),
                "healthy": healthy_count,
                "degraded": degraded_count,
                "awaiting_approval": awaiting_count,
                "collectors": [
                    {
                        "key": s.key,
                        "collector_id": s.collector_id,
                        "health": str(s.health.value),
                        "fill_rate": s.last_fill_rate,
                        "awaiting_approval": s.awaiting_approval,
                        "is_provisioned": s.is_provisioned,
                    }
                    for s in statuses
                ],
                "healing_instructions": (
                    "To heal a broken scraper: 1) Trigger heal: 'bdata scraper heal <collector_id> "
                    '"<feedback_on_selectors>"\'. 2) Review proposed selector diffs. '
                    "3) Deploy fix: 'bdata scraper approve <collector_id>'."
                ),
            },
            grounded=True,
        )

    # -- internals ---------------------------------------------------------

    async def _resolve_city(self, requested: object) -> str | ToolResult | None:
        """Accept a city only if the data actually contains it."""
        text = _text(requested)
        if not text:
            return None

        if not self._known_cities:
            signal_cities = await self.signals.known_cities()
            job_cities = await self.jobs.known_cities() if self.jobs else ()
            combined = set(signal_cities) | set(job_cities) | {member.value for member in City}
            self._known_cities = tuple(sorted(combined))

        match = next(
            (
                city
                for city in self._known_cities
                if city.casefold() in text.casefold() or text.casefold() in city.casefold()
            ),
            None,
        )
        if match is None:
            return ToolResult(
                payload={
                    "error": f"no signals or jobs for city {text!r}",
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
    """Parse a source type, ignoring an unrecognised one rather than failing."""
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
        """Answer one question, calling tools until the model stops asking."""
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
        """Build the completer (Groq, OpenAI, or Anthropic) or raise CopilotUnavailable."""
        groq_key = self._settings.groq_api_key.strip() or os.getenv("GROQ_API_KEY", "").strip()
        openai_key = (
            self._settings.openai_api_key.strip() or os.getenv("OPENAI_API_KEY", "").strip()
        )
        anthropic_key = (
            self._settings.anthropic_api_key.strip() or os.getenv("ANTHROPIC_API_KEY", "").strip()
        )

        provider = self._settings.copilot_provider.lower()

        # Groq selection
        if groq_key and (provider == "groq" or (not openai_key and not anthropic_key)):
            return self._build_openai_compatible_completer(
                api_key=groq_key,
                base_url="https://api.groq.com/openai/v1",
                default_model="llama-3.3-70b-versatile",
            )

        # OpenAI selection
        if openai_key and (provider == "openai" or not anthropic_key):
            return self._build_openai_compatible_completer(
                api_key=openai_key,
                base_url="https://api.openai.com/v1",
                default_model="gpt-4o",
            )

        # Anthropic selection
        if anthropic_key:
            return self._build_anthropic_completer(anthropic_key)

        # Fallback to Groq if key exists
        if groq_key:
            return self._build_openai_compatible_completer(
                api_key=groq_key,
                base_url="https://api.groq.com/openai/v1",
                default_model="llama-3.3-70b-versatile",
            )

        raise CopilotUnavailable(
            "No Copilot API key configured (GROQ_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY). "
            "The Signal Copilot is disabled. Every other endpoint works without it."
        )

    def _build_openai_compatible_completer(
        self,
        api_key: str,
        base_url: str,
        default_model: str,
    ) -> Completer:
        import httpx  # noqa: PLC0415

        model = (
            self._settings.copilot_model
            if self._settings.copilot_model
            and not self._settings.copilot_model.startswith("claude")
            else default_model
        )

        async def complete(
            conversation: Sequence[Mapping[str, Any]],
            definitions: Sequence[Mapping[str, Any]],
        ) -> Any:
            openai_tools = [
                {
                    "type": "function",
                    "function": {
                        "name": tool["name"],
                        "description": tool["description"],
                        "parameters": tool.get("input_schema", {}),
                    },
                }
                for tool in definitions
            ]

            openai_messages: list[dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]
            for turn in conversation:
                role = turn.get("role")
                content = turn.get("content")

                if role == "user":
                    if isinstance(content, list) and all(
                        isinstance(c, dict) and c.get("type") == "tool_result" for c in content
                    ):
                        for res in content:
                            openai_messages.append(
                                {
                                    "role": "tool",
                                    "tool_call_id": res.get("tool_use_id"),
                                    "content": res.get("content", ""),
                                }
                            )
                    else:
                        openai_messages.append({"role": "user", "content": str(content)})
                elif role == "assistant":
                    if isinstance(content, dict) and "tool_calls" in content:
                        openai_messages.append(content)
                    elif isinstance(content, list):
                        text_blocks = [
                            b.get("text", "") for b in content if b.get("type") == "text"
                        ]
                        tool_use_blocks = [b for b in content if b.get("type") == "tool_use"]
                        tool_calls = [
                            {
                                "id": b["id"],
                                "type": "function",
                                "function": {
                                    "name": b["name"],
                                    "arguments": json.dumps(b.get("input", {})),
                                },
                            }
                            for b in tool_use_blocks
                        ]
                        msg: dict[str, Any] = {
                            "role": "assistant",
                            "content": "\n\n".join(text_blocks) or None,
                        }
                        if tool_calls:
                            msg["tool_calls"] = tool_calls
                        openai_messages.append(msg)
                    else:
                        openai_messages.append({"role": "assistant", "content": str(content)})

            payload = {
                "model": model,
                "messages": openai_messages,
                "tools": openai_tools,
                "temperature": 0.0,
            }

            async with httpx.AsyncClient(timeout=60.0) as client:
                res = await client.post(
                    f"{base_url.rstrip('/')}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                if res.status_code != 200:
                    logger.error(
                        "copilot.provider_error",
                        extra={"status": res.status_code, "body": res.text},
                    )
                    raise CopilotUnavailable(f"LLM provider error ({res.status_code}): {res.text}")
                return res.json()

        return complete

    def _build_anthropic_completer(self, api_key: str) -> Completer:
        from anthropic import AsyncAnthropic  # noqa: PLC0415

        client = AsyncAnthropic(api_key=api_key)
        model = self._settings.copilot_model

        async def complete(
            conversation: Sequence[Mapping[str, Any]],
            definitions: Sequence[Mapping[str, Any]],
        ) -> Any:
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
    """Pull text and tool calls out of a response from any provider or test stub."""
    text_parts: list[str] = []
    calls: list[_ToolCall] = []

    if isinstance(response, dict) and "choices" in response:
        choice = (response.get("choices") or [{}])[0]
        message = choice.get("message") or {}
        content = message.get("content")
        if content:
            text_parts.append(str(content))
        for tc in message.get("tool_calls") or []:
            fn = tc.get("function") or {}
            args_raw = fn.get("arguments", "{}")
            if isinstance(args_raw, str):
                try:
                    args = json.loads(args_raw)
                except json.JSONDecodeError:
                    args = {}
            elif isinstance(args_raw, dict):
                args = args_raw
            else:
                args = {}
            calls.append(
                _ToolCall(
                    call_id=str(tc.get("id", "")),
                    name=str(fn.get("name", "")),
                    arguments=args,
                )
            )
        return "\n\n".join(text_parts).strip(), tuple(calls)

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
    if isinstance(response, dict) and "choices" in response:
        choice = (response.get("choices") or [{}])[0]
        return choice.get("message") or {}
    return getattr(response, "content", [])


def _unique(signals: Sequence[NormalizedSignal]) -> tuple[NormalizedSignal, ...]:
    """Deduplicate citations by id, keeping first-seen order."""
    seen: dict[str, NormalizedSignal] = {}
    for signal in signals:
        seen.setdefault(signal.signal_id, signal)
    return tuple(seen.values())
