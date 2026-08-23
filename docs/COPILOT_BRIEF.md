# Signal Atlas — Signal Copilot brief

**For:** whoever owns the Copilot track.
**Status:** the seam is built and wired; the feature is yours to finish, verify and defend.

This document is self-contained. You do not need to read the rest of the repository, or any
conversation, to act on it.

## What the Copilot is

A chat panel over the same database the map reads. Someone asks *"what's emerging in Delhi?"*
and gets an answer built from stored signals, with the `signal_id`s it used cited so a judge
can click through to the evidence.

What it is **not**: a second brain with its own opinions about the data. Every number in a
reply must come from a tool call into the existing services. If the chat says a zone scores
7.3 and the map marker says 4.1, the whole submission loses credibility — so the Copilot
calls the *same code the map calls*, and contains no SQL and no scoring arithmetic itself.

## The one failure mode to design against

An earlier draft of this feature answered **every** question with Pune, IoT and a score of
`8.42`. It looked perfect in a screenshot. It was hardcoded: no database session, no tool
calls, no grounding. That is the specific outcome this design exists to prevent, and it is
the first thing a judge will probe by asking about a city that has no data.

Three guards are already in the code. Do not remove them:

1. **A real session is injected.** `get_copilot_service` in `app/api/deps.py` builds the
   service over live `SignalService` and `ZoneService` instances. There is no `db=None`
   default anywhere.
2. **Cities are validated against the data**, not a hardcoded list.
   `SignalTools._resolve_city` compares the requested city to `SELECT DISTINCT city` and
   returns an error payload naming the cities that exist. An unknown city can never be
   silently substituted.
3. **Grounding is a returned field, not a hope.** `CopilotAnswer.grounded` is `False` unless
   a tool actually returned data, and the wire response carries it.

## What already exists

| File | What it holds |
|---|---|
| `app/services/copilot.py` | `SignalTools` (the two tools), `CopilotService` (the tool-use loop), `SYSTEM_PROMPT`, `Completer` seam |
| `app/api/routes/chat.py` | `POST /api/chat` — 15 lines, no logic |
| `app/schemas/chat.py` | `ChatRequest`, `ChatTurn`, `ChatOut`, `ChatCitation` |
| `app/api/deps.py` | `get_copilot_service` — assembles the service over the real services |
| `app/services/errors.py` | `CopilotUnavailable` → `503 copilot_unavailable` |
| `app/config.py` | `anthropic_api_key`, `copilot_model` (`claude-sonnet-5`), `copilot_max_tool_iterations` (`5`) |

It runs end to end today against a stub completer. What it has never done is talk to a real
Anthropic API, and it has **no tests** — both are yours.

## The two tools, and why only two

Both are thin adapters. Read them in `app/services/copilot.py`.

### `search_signals(city?, domain?, source_type?, limit?)`

Calls `SignalService.search(...)`. Returns:

```json
{ "total_matching": 12, "returned": 10, "signals": [ { "signal_id": "…", "title": "…",
  "date": "…", "city": "…", "domain": "…", "source_type": "…", "signal_type": "…",
  "source_url": "…", "evidence_count": 3 } ] }
```

The model sees a compact projection, not the row: fewer tokens, and internal fields (raw
payload paths, collector keys) cannot leak into a reply. `source_type` is an **enum** in the
tool schema, generated from `SourceType`, so the model cannot invent a fifth category.

### `get_emergence_score(city, domain)`

Calls `ZoneService.score_for(city, domain)`. Returns the zone with its `score`,
`confidence`, `signal_count`, `deduplicated_count`, `distinct_source_types`, `was_capped`
and the per-source `contributions` — or, for an empty bin:

```json
{ "found": false, "reason": "no signals stored for Delhi / Blockchain",
  "known_domains": ["AI/ML", "IoT", "Robotics", …] }
```

`score_for` returns `None` rather than a zero-scored zone on purpose. A confident `0.0`
reads like a measurement; `found: false` reads like an absence, and the model can only say
"there is no data for that" if it is told the difference.

### If you need a third tool

**Add a method to a service or repository — never SQL in `copilot.py`.** If the Copilot needs
"signals in the last 7 days", that belongs on `SignalRepository`, and then the REST API can
have it too. This is the rule that keeps the two surfaces from drifting, and it is also the
rule an import-linter contract and a code reviewer will both check.

## The contract you must not change

`POST /api/chat` is in [`API_CONTRACT.md`](API_CONTRACT.md) and the frontend is building
against it. Request:

```json
{ "message": "What is emerging in Delhi?",
  "history": [{"role": "user", "content": "…"}, {"role": "assistant", "content": "…"}] }
```

Response:

```json
{ "reply": "…", "citations": [{"signal_id": "…", "title": "…", "city": "…",
  "domain": "…", "source_url": "…"}], "tools_used": ["search_signals"], "grounded": true }
```

Limits: `message` ≤2000 chars, ≤20 history turns, each `content` ≤4000. The server is
**stateless** — history is replayed by the client, so there is no session store to expire and
nothing to leak between users. Keep it that way; for a demo panel, resending twenty turns
costs nothing.

## Running it

```bash
.venv/Scripts/activate
```

Add to `.env` (never commit it — `.env.example` carries empty values only):

```
ANTHROPIC_API_KEY=sk-ant-…
```

```bash
py -3.12 -m uvicorn app.main:create_app --factory --reload
```

```bash
curl -sS -X POST http://localhost:8000/api/chat -H 'Content-Type: application/json' \
  -d '{"message": "What is emerging in Delhi?"}' | jq .
```

Seed data first if the database is empty, or every answer will honestly tell you there is
nothing there:

```bash
.venv/Scripts/python.exe -m app.seed
```

Without a key, `POST /api/chat` returns `503 copilot_unavailable` and **every other endpoint
still works**. `GET /api/health` reports `copilot_enabled`; that is the flag the frontend
uses to hide the panel rather than surface a 503.

## Testing it without a key

`CopilotService` takes a `completer` — one async callable that receives
`(conversation, tool_definitions)` and returns something shaped like a Messages API
response. The route reads it from `app.state.completer`. Set that and the **entire tool loop
runs offline**, no key, no network, no billing:

```python
from dataclasses import dataclass

@dataclass
class Text:
    text: str
    type: str = "text"

@dataclass
class ToolUse:
    id: str
    name: str
    input: dict
    type: str = "tool_use"

@dataclass
class Reply:
    content: list

async def test_a_score_question_is_answered_from_the_database(client, app_instance, stored):
    turns = [
        Reply([ToolUse(id="t1", name="get_emergence_score",
                       input={"city": "Delhi", "domain": "AI/ML"})]),
        Reply([Text("Delhi AI/ML scores 7.3 across three source types [sig_…].")]),
    ]
    app_instance.state.completer = lambda conversation, tools: _next(turns)

    body = (await client.post("/api/chat", json={"message": "How is Delhi AI/ML?"})).json()

    assert body["grounded"] is True
    assert body["tools_used"] == ["get_emergence_score"]
```

Blocks are read with `getattr`, so plain dataclasses work — you do not need to import the
SDK or build a fake `Message`. `tests/conftest.py` already gives you `client`,
`app_instance`, an in-memory database and the store helpers in `tests/helpers.py`; copy the
scenario pattern from `tests/integration/api/test_read_endpoints.py`.

### The tests that matter

Ordered by how badly the demo breaks without them:

1. **An unknown city is refused, not substituted.** Ask about Mumbai with only Delhi and SF
   stored; assert the reply does not contain "Delhi" as an answer and `grounded is False`.
   This is the hardcoding regression test.
2. **A number in the reply came from a tool.** Assert `tools_used` is non-empty whenever the
   reply contains a digit, and that the tool payload actually held that number.
3. **An empty result says so.** `search_signals` returning `[]` → `grounded is False` and
   `citations == []`. An ungrounded answer must never carry citations.
4. **Citations resolve.** Every `citations[].signal_id` returns `200` from
   `GET /api/signals/{signal_id}`.
5. **No key is a clean 503.** Unset `ANTHROPIC_API_KEY`, no `app.state.completer` →
   `503` with `code: copilot_unavailable`, and `/api/health` still `200`.
6. **The loop terminates.** A stub that asks for a tool forever must stop at
   `copilot_max_tool_iterations` and return the "could not finish looking that up" reply, not
   hang and not spend money.

Run:

```bash
.venv/Scripts/python.exe -m pytest tests/integration/api/test_copilot.py -v
```

The suite runs with `filterwarnings = ["error"]` and `--strict-config`, ruff enforces type
annotations in tests too, and `mypy app` must stay clean. Check all four before pushing:

```bash
ruff check . && ruff format --check . && .venv/Scripts/lint-imports.exe && .venv/Scripts/python.exe -m pytest -q
```

## The gate

The Copilot is **additive**. It is not merged until the core pipeline is green, and it is not
in the demo until it answers from live data. If it is not ready on the day, we cut it and the
README's Planned section says so — that costs us nothing. A chat panel that confidently
invents a score costs us the submission.

Concretely, it ships when:

- [ ] `POST /api/chat` answers a real question from seeded data, citing real `signal_id`s
- [ ] a question about an uncovered city is refused by name
- [ ] the six tests above pass with **no** `ANTHROPIC_API_KEY` present
- [ ] `ruff`, `mypy`, `lint-imports` and `pytest` are all green
- [ ] `copilot.py` still contains no SQL and no scoring arithmetic

## Things worth knowing before you start

- **Model id is `claude-sonnet-5`** (`settings.copilot_model`). The SDK is imported *inside*
  `_default_completer`, so the package being absent never breaks the rest of the app.
- **The system prompt is the grounding contract.** It is in `SYSTEM_PROMPT` in
  `copilot.py` — never state a number that did not come from a tool, say when data is
  missing, cite `signal_id`s inline, two cities are in scope. Change it deliberately, and
  re-run the tests above afterwards; they are what stop a prompt edit from re-introducing
  confident invention.
- **Only two cities exist in the data: Delhi (NCR) and San Francisco (Bay Area).** Not Pune —
  older planning notes say otherwise and they are wrong.
- **Scores move between calls.** The emergence score has a time-decay term and zones are
  derived per request, never cached, so two identical questions a minute apart can differ in
  the third decimal. Don't assert exact floats; use a tolerance.
- **Ask me for a repository method** rather than writing a query in `copilot.py`. It is
  usually a five-line addition and it keeps the clean-code story intact.

Full endpoint reference: [`API_CONTRACT.md`](API_CONTRACT.md). Real captured responses:
[`examples/sample_signals.json`](../examples/sample_signals.json).

