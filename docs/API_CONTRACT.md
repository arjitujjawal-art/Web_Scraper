# Signal Atlas — API contract

For the frontend. Everything the map, the evidence panel and the collector dashboard
need, with the exact field names the server sends.

- Base URL in development: `http://localhost:8000`
- Every path below is prefixed with `/api`
- Interactive, always-current version: `http://localhost:8000/docs` (OpenAPI at `/openapi.json`)
- Real captured responses for every endpoint: [`examples/sample_signals.json`](../examples/sample_signals.json)

Read endpoints are public — no header, no token, nothing to put in browser code. Only
the three collector operations require a key, and that key belongs on an operator's
machine, never in a bundle.

## Conventions

| Thing | Rule |
|---|---|
| Timestamps | ISO 8601, UTC, `Z` suffix — `2026-08-22T12:00:00Z` |
| Floats | Scores and fill rates are rounded to 3 decimals for display |
| Unknown query value | `422` with `code: validation_error`, never a silently empty page |
| Missing resource | `404` with a specific `code` (`zone_not_found`, `unknown_collector`, `not_found`) |
| Errors | Always the same two-field envelope, below |
| CORS | Origins from `FRONTEND_ORIGINS`; methods `GET, POST`; headers `Content-Type, X-Admin-Key`. No credentials — the API uses no cookies |

### Error envelope

Every failure — pydantic validation, a service refusal, a missing route, an auth
rejection — has this shape. One error handler on the client covers all of them.

```json
{ "detail": "no zone with id 'pune-blockchain'", "code": "zone_not_found" }
```

`detail` is for a human. `code` is stable and safe to branch on:

| `code` | Status | Means |
|---|---|---|
| `validation_error` | 422 | Query or body failed schema validation |
| `invalid_input` | 422 | A domain rule rejected it (heal prompt too long, malformed collector id) |
| `unauthorized` | 401 | `X-Admin-Key` missing or wrong (`WWW-Authenticate` header is set) |
| `zone_not_found` | 404 | No zone with that id at the current data |
| `unknown_collector` | 404 | Key is not in the registry; `detail` lists the valid keys |
| `not_found` | 404 | Unknown signal id, or an unrouted path |
| `run_not_found` | 404 | Unknown `run_id` |
| `collector_not_provisioned` | 409 | Registry entry exists, no `c_*` collector created yet |
| `collector_disabled` | 409 | Collector switched off in the registry |
| `nothing_to_approve` | 409 | `approve` called with no repair pending |
| `copilot_unavailable` | 503 | `ANTHROPIC_API_KEY` unset — every other endpoint still works |
| `cli_error` | 502/503/504 | Bright Data CLI failed, is missing, or timed out |

## `GET /api/health`

One request that says whether this instance can serve a demo. Always `200`, even on an
empty database — the numbers report the problem instead of the status code.

```json
{
  "status": "ok", "app": "Signal Atlas", "version": "0.1.0",
  "signals": 54, "collectors": 9, "collectors_provisioned": 0,
  "collectors_need_attention": 0, "active_jobs": 0,
  "latest_signal_at": "2026-08-22T12:00:00Z", "copilot_enabled": false
}
```

`collectors_provisioned` is the field worth surfacing in the UI: `0` means every registry
entry is still `PENDING` and no collector operation will run. `active_jobs` is how you know
a heal is still in flight.

## `GET /api/zones`

The map. Scores every `(city, domain)` bin from the signals currently stored, best first.

| Query | Type | Default | Notes |
|---|---|---|---|
| `city` | string ≤64 | — | Exact match, e.g. `Delhi` |
| `domain` | string ≤64 | — | Exact match, e.g. `AI/ML` |
| `min_score` | float ≥0 | `0.0` | Declutter only. Negative → `422` |

```json
{ "items": [ /* ZoneOut */ ], "total": 3 }
```

`total` is the number of zones returned; this endpoint is not paged (a map draws all its
markers). Filtering never changes a score — bins are independent — so a zone opened from a
filtered map shows the same number as the map did.

### ZoneOut

| Field | Type | Notes |
|---|---|---|
| `zone_id` | string | `slugify(city)-slugify(domain)` → `delhi-ai-ml`. Stable, deep-linkable |
| `city`, `domain` | string | Canonical values |
| `score` | float | Emergence score. Decays with time, so it changes between requests |
| `confidence` | `HIGH` \| `MEDIUM` \| `LOW` | ≥3 / 2 / 1 distinct source types |
| `coordinates` | `{latitude, longitude}` | WGS84. Same city, different domains do not stack |
| `signal_count` | int | Raw records in the bin |
| `deduplicated_count` | int | Distinct events after merging. Render the pair: "8 records, 6 events" |
| `distinct_source_types` | int | 1–4. What `confidence` is derived from |
| `was_capped` | bool | True when the concentration ceiling reduced the score |
| `contributions` | `[{source_type, raw, capped, was_capped}]` | Per-source breakdown, largest first. `capped` values sum to `score` |
| `signal_ids` | string[] | The merged survivors this score was built from |

`contributions` plus `deduplicated_count` is the entire "why is this flagged?" panel — no
second request needed.

## `GET /api/zones/{zone_id}`

One `ZoneOut`. No `min_score` applies: a deep link opens the zone it names even when the
map is filtered above it. Unknown id → `404 zone_not_found`.

## `GET /api/zones/{zone_id}/signals`

The evidence behind a marker, in scoring order.

```json
{ "zone_id": "delhi-ai-ml", "city": "Delhi", "domain": "AI/ML", "signals": [ /* SignalOut */ ] }
```

These are the **deduplicated** signals. When three outlets reported one lab opening, you
get one entry with `evidence_count: 3` and all three URLs in `evidence_urls` — that is the
"3 outlets reported this, counted once" line.

## `GET /api/signals`

The raw evidence layer, browsable on its own and **not** deduplicated: both copies of a
duplicated story are listed, so a user can check the merge rather than trust it.

| Query | Type | Default | Notes |
|---|---|---|---|
| `city` | string ≤64 | — | |
| `domain` | string ≤64 | — | |
| `source_type` | enum | — | `startup_newsroom`, `university_research`, `incubator_news`, `tech_event`. Anything else → `422` |
| `since` | ISO datetime | — | Signals dated on or after |
| `limit` | int 1–200 | `50` | Over 200 → `422` |
| `offset` | int ≥0 | `0` | |

```json
{ "items": [ /* SignalOut */ ], "meta": {"total": 54, "limit": 3, "offset": 0, "has_more": true} }
```

`meta.total` is the count matching the filter, ignoring paging, so a "showing 3 of 54"
label needs no arithmetic.

### SignalOut

| Field | Type | Notes |
|---|---|---|
| `signal_id` | string | `sig_<city>_<domain>_<hash>` — derived from the source URL and title, so the same article re-scraped keeps its id |
| `collector_key` | string | Which registry entry produced it |
| `source_type` | enum | One of the four categories |
| `source_url` | string | The page it came from |
| `title`, `summary` | string | |
| `date` | datetime | When the event was published/announced. Drives decay |
| `city`, `domain` | string | Canonical, resolved by the normalizer |
| `area` | string \| null | Sub-city locality (`Gurugram`, `Mission Bay`) when the source gave one |
| `signal_type` | `facility_expansion` \| `research_grant` \| `tech_event` | Drives the score weight (3.0 / 2.0 / 1.0) |
| `extracted_at` | datetime | When we scraped it |
| `evidence_urls` | string[] | Every outlet merged into this signal |
| `evidence_count` | int | `max(1, len(evidence_urls))` |

## `GET /api/signals/{signal_id}`

One `SignalOut`, for a citation link out of the chat panel. Unknown id → `404 not_found`.

## `GET /api/collectors`

The collector dashboard: registry configuration joined to the latest observed health.
Unprovisioned and disabled collectors are **listed, not hidden** — a dashboard that looks
complete while one `PENDING` id is about to fail the demo is worse than a red row.

```json
{ "items": [ /* CollectorOut */ ], "total": 9, "needs_attention": 1 }
```

`needs_attention` is the badge count. Not paged — the registry is nine entries.

### CollectorOut

| Field | Type | Notes |
|---|---|---|
| `key` | string | The registry key. This is what admin routes take in the path |
| `source_type` | enum | One of the four categories |
| `collector_id` | string | The Bright Data `c_*` id, or `PENDING` |
| `urls` | string[] | Registered targets. `POST /run` accepts only these |
| `city_hint` | string \| null | Which city this source covers |
| `description` | string \| null | |
| `required_fields` | string[] | The fields the fill rate is measured over |
| `enabled` | bool | False → operations refuse with `409 collector_disabled` |
| `is_provisioned` | bool | False → `409 collector_not_provisioned`. Render this as "not set up yet", not as an error |
| `health` | `HEALTHY` \| `DEGRADED` \| `HEALING_REVIEW` \| `HEALED` \| `FAILED` \| `UNKNOWN` | `UNKNOWN` means it has never run |
| `awaiting_approval` | bool | A repair is proposed and waiting on a human |
| `needs_attention` | bool | The one boolean to colour a row by |
| `last_run_id` | string \| null | Feed straight back into `/api/collector-runs/{run_id}` |
| `last_action` | `run` \| `heal` \| `approve` \| null | |
| `last_status` | `QUEUED` \| `RUNNING` \| `SUCCEEDED` \| `FAILED` \| null | |
| `last_run_at` | datetime \| null | |
| `last_fill_rate` | float \| null | `1.0` healthy, `0.5` in the demo's broken run |
| `last_records_found` | int \| null | |
| `last_error` | string \| null | |
| `notes` | string \| null | The human sentence explaining a degradation |

## `GET /api/collectors/{collector_key}`

One `CollectorOut`. Unknown key → `404 unknown_collector`, and `detail` lists the valid
keys, so a typo is self-correcting. Configuration is readable without a key: nothing here
is a secret.

## `GET /api/collector-runs`

The audit trail. Newest first, and the whole heal cycle is readable from it.

| Query | Type | Default | Notes |
|---|---|---|---|
| `collector_key` | string ≤64 | — | |
| `action` | enum | — | `run`, `heal`, `approve`. Anything else → `422` |
| `status` | enum | — | `QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED` |
| `limit` | int 1–200 | `25` | |

```json
{ "items": [ /* CollectorRunOut */ ], "total": 5 }
```

## `GET /api/collector-runs/{run_id}`

One `CollectorRunOut` — **the polling endpoint**. Unknown id → `404 run_not_found`.

### CollectorRunOut

| Field | Type | Notes |
|---|---|---|
| `run_id` | string | |
| `collector_key`, `collector_id` | string | |
| `action` | `run` \| `heal` \| `approve` | |
| `status` | `QUEUED` \| `RUNNING` \| `SUCCEEDED` \| `FAILED` | Stop polling on the last two |
| `health` | enum | The verdict this run produced |
| `target_url` | string \| null | Which registered URL was scraped |
| `records_found` | int | Raw rows the CLI returned |
| `records_stored` | int | Rows that survived normalization |
| `fill_rate` | float | Populated required fields ÷ (rows × required fields), measured on the **raw** rows |
| `missing_fields` | string[] | Which required fields went absent — the "what broke" line |
| `rejected_records` | int | `records_found - records_stored` |
| `rejection_reasons` | string[] | Distinct reasons, e.g. `["missing or too-short title"]` |
| `cli_status` | string \| null | Verbatim from the CLI: `done`, `awaiting_approval` |
| `view_url` | string \| null | The Scraper Studio page for this job |
| `diff_summary` | string \| null | **The proposed repair.** Heal only |
| `next_step` | string \| null | What the CLI says to do next. Heal only |
| `preview_rows` | object[] \| null | Rows the repaired selectors would extract. Heal only |
| `heal_prompt` | string \| null | The prompt that was sent, recorded for the audit trail |
| `error` | string \| null | Set only when `status` is `FAILED` |
| `notes` | string \| null | Plain-English explanation of a `DEGRADED` verdict |
| `started_at` | datetime | |
| `finished_at` | datetime \| null | Null while running |
| `duration_seconds` | float \| null | Wall clock of the CLI call |

`status` and `health` answer different questions. `status: SUCCEEDED` + `health: DEGRADED`
is the normal case for a broken page: the job ran fine, the *page* changed. Colour by
`health`; stop polling on `status`.

`diff_summary` + `preview_rows` **is** the review screen. Render both before offering an
approve button.

## Collector operations (admin)

Three routes start real Bright Data jobs. All three require `X-Admin-Key`, and all three
return **`202 Accepted`**, never `200` — `brightdata scraper heal` blocks for up to 600
seconds, which no browser request survives. See
[`adr/0001-async-cli-jobs.md`](adr/0001-async-cli-jobs.md).

```
POST /api/collectors/{collector_key}/run       body: {"url": "…"}     optional
POST /api/collectors/{collector_key}/heal      body: {"prompt": "…"}  required
POST /api/collectors/{collector_key}/approve   no body
```

Every one answers with the same acknowledgement:

```json
{
  "run_id": "run_9f2c41ab7d05", "collector_key": "demo_newsroom",
  "action": "run", "status": "QUEUED",
  "poll_url": "/api/collector-runs/run_9f2c41ab7d05",
  "message": "queued; poll poll_url until status is SUCCEEDED or FAILED"
}
```

`poll_url` is handed back rather than documented-only: build nothing, just follow it.

### `POST …/run`

`url` is **not** a fetch target. It selects among the URLs already in the collector's
registry entry, and anything else is refused. There is no code path from a request body to
an arbitrary URL, which is how SSRF is removed by construction rather than by allowlist.
Omit `url` for the primary one.

### `POST …/heal`

```json
{ "prompt": "Article titles moved from article.news-card h2 to div.press-wrapper h3.press-wrapper__heading, and the city now appears in span.release-city." }
```

Plain English, 1–1000 characters. The cap is the CLI's own, enforced here so an over-long
prompt fails instantly with `422 invalid_input` instead of after a ten-minute round trip.

The repair comes back **gated**: the run reaches `SUCCEEDED` with `health: HEALING_REVIEW`
and `cli_status: awaiting_approval`, carrying `diff_summary`, `next_step` and
`preview_rows`. Nothing has changed on the collector yet.

### `POST …/approve`

Applies the repair the last heal proposed. `409 nothing_to_approve` when none is pending —
checked against our own run history, because asking Bright Data would cost 600 seconds to
learn the same thing. Approving twice is therefore a `409`, not a duplicate job.

`--auto-approve` exists in the CLI and this API never passes it. The gap between `heal` and
`approve` — a human reading a diff — is the product. Asserted by a test that scans every
argv the application can build.

### Failure modes on these three

| Situation | Response |
|---|---|
| Missing/wrong `X-Admin-Key` | `401 unauthorized` |
| Unknown `collector_key` | `404 unknown_collector` |
| `collector_id` still `PENDING` | `409 collector_not_provisioned` |
| `enabled: false` in the registry | `409 collector_disabled` |
| Prompt empty or >1000 chars | `422` |
| `url` not in the registry entry | `422 invalid_input` |
| CLI missing, failed or timed out | Job is **accepted**, then the run row ends `FAILED` with `error` |

That last row matters: once you hold a `run_id`, failures arrive on the run, not on the
POST. A run never sticks in `RUNNING` — every path, including process shutdown, records a
terminal status, so a poller always terminates.

### Polling recipe

```js
async function dispatch(path, body) {
  const res = await fetch(`http://localhost:8000${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Admin-Key": ADMIN_KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw Object.assign(new Error(), await res.json()); // {detail, code}

  const { poll_url } = await res.json();
  for (;;) {
    const run = await (await fetch(`http://localhost:8000${poll_url}`)).json();
    if (run.status === "SUCCEEDED" || run.status === "FAILED") return run;
    await new Promise((r) => setTimeout(r, 1500));
  }
}
```

Poll every 1–2 s. A fixture run finishes in under a second; a real `heal` can take minutes,
so show `status` and a spinner rather than blocking the UI. `GET /api/health` exposes
`active_jobs` if you want a global "something is running" indicator.

## `POST /api/chat` — Signal Copilot

Partner track, and the only endpoint that needs configuration to exist:
`ANTHROPIC_API_KEY` unset → `503 copilot_unavailable`. Check `copilot_enabled` on
`/api/health` and hide the panel rather than surfacing a 503.

```json
{ "message": "What is emerging in Delhi?", "history": [{"role": "user", "content": "…"}] }
```

Stateless — prior turns are replayed by the client (≤20 turns, `message` ≤2000 chars,
each `content` ≤4000). No session store, nothing to leak between users.

```json
{
  "reply": "Delhi's AI/ML zone scores 7.302 …",
  "citations": [{"signal_id": "sig_delhi_ai-ml_9c1f04ab72", "title": "…", "city": "Delhi",
                 "domain": "AI/ML", "source_url": "https://…"}],
  "tools_used": ["search_signals", "get_emergence_score"],
  "grounded": true
}
```

`grounded` is `false` when no tool returned data that backs the reply — render that
differently, or not at all. Every `citations[].signal_id` resolves through
`GET /api/signals/{signal_id}`, so citations are clickable.

## `GET /`

Not under `/api`. A discovery stub: `{name, version, docs, health}`.

## Notes for the frontend

- **Nothing is cached server-side.** Zone scores are derived per request from the signals
  currently stored, and the decay term moves, so two calls a minute apart can differ in the
  third decimal. Don't diff scores to detect change; re-render.
- **`zone_id` is the only durable identifier for a marker.** It is derived from city and
  domain, so it survives re-scrapes and reseeds. Signal ids are stable too; run ids are not
  meaningful across a database reset.
- **Read endpoints never need a key.** If browser code holds `X-Admin-Key`, the design has
  gone wrong — that key belongs on an operator's machine.
- **Unknown filter values are `422`, not empty pages.** An empty `items` array always means
  "no data matched", never "you sent something invalid".
- Real captured responses for every endpoint above:
  [`examples/sample_signals.json`](../examples/sample_signals.json).




