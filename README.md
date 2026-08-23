# Signal Atlas — backend

**Emerging technology hubs announce themselves before anyone names them.** A university
publishes a lab opening, an incubator announces a cohort, a company posts a facility
expansion, a meetup appears — four unrelated organisations, four unrelated websites, the same
city and the same technical domain, all within a few weeks. Nobody publishes *that*. It only
exists as a pattern across sources.

Signal Atlas is the backend that finds it. It scrapes four categories of public early signal
across Delhi (NCR) and San Francisco (Bay Area) with Bright Data Scraper Studio collectors,
normalizes them into one schema, merges duplicate reports of the same event, and scores each
`(city, domain)` bin by time-decayed weighted evidence. What the frontend gets is a ranked list
of **convergence zones** with the evidence attached.

```
GET /api/zones?city=Delhi
```

```json
{ "zone_id": "delhi-ai-ml", "score": 7.302, "confidence": "HIGH",
  "signal_count": 8, "deduplicated_count": 6, "distinct_source_types": 4,
  "was_capped": false,
  "contributions": [ { "source_type": "university_research", "raw": 2.686, "capped": 2.686 },
                     { "source_type": "startup_newsroom",    "raw": 1.731, "capped": 1.731 },
                     { "source_type": "incubator_news",      "raw": 1.721, "capped": 1.721 },
                     { "source_type": "tech_event",          "raw": 1.163, "capped": 1.163 } ] }
```

Every number in that response is decomposable. `contributions` sums to `score`, so a judge with
a calculator can check the published scoring rule rather than take it on trust.

The second half of the product is what happens when a source page changes shape. A layout change
silently starves a scraper: it keeps returning 200, the rows keep arriving, the fields are empty.
Signal Atlas measures **fill rate** per run, flags the collector `DEGRADED`, and exposes an
approval-gated repair path through Scraper Studio's `heal` / `approve` — a human reads the
proposed selector change before it is applied. See
[`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) for the reproducible five-step run.

---

## Scope

This repository is **the backend only**. The map frontend and the Signal Copilot chat assistant
are separate tracks owned by teammates; their contracts live in
[`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) and
[`docs/COPILOT_BRIEF.md`](docs/COPILOT_BRIEF.md), both written to be read standalone.

## Quickstart

Nothing below needs a Bright Data key, an Anthropic key, or a network connection. Read
endpoints, the full domain core and the entire heal → approve cycle run against seeded data and
a fake CLI. Keys are only needed to drive real collectors.

```bash
py -3.12 -m venv .venv
source .venv/Scripts/activate
pip install -r requirements.txt -r requirements-dev.txt
```

```bash
cp .env.example .env
py -3.12 -c "import secrets; print(secrets.token_urlsafe(32))"   # paste into ADMIN_API_KEY
```

`ADMIN_API_KEY` must be at least 16 characters. The app **refuses to boot** without it, because
an unset secret must never silently mean "open".

```bash
.venv/Scripts/python.exe -m app.seed
py -3.12 -m uvicorn app.main:create_app --factory --reload
```

```bash
curl -sS localhost:8000/api/health
curl -sS "localhost:8000/api/zones?city=Delhi"
```

`--factory` is required: there is deliberately no module-level `app`. Building the application at
import time would read settings and construct a database engine during test collection, which
makes the suite depend on your `.env`.

The seed pushes 54 raw collector rows through the same normalizer a live run uses, across both
cities and all four source types, dated relative to the clock so decay is visible immediately.
Interactive docs are at `/docs`.

---

## Architecture

Four layers, and the arrows only point one way.

```
                  ┌──────────────────────────────────────────────┐
   HTTP  ────────▶│ api/       routes · deps · security · errors  │
                  └──────────────────┬───────────────────────────┘
                                     │  calls exactly one service
                  ┌──────────────────▼───────────────────────────┐
                  │ services/  ingest · healing · zones · signals │
                  │            collectors · jobs · clock · copilot│
                  └─────────┬────────────────────────┬───────────┘
                            │                        │
        ┌───────────────────▼─────────┐   ┌──────────▼────────────────────┐
        │ infra/  cli · db · registry │   │ domain/  PURE — no I/O at all │
        │  subprocess, SQLAlchemy,    │   │  models · enums · dates       │
        │  YAML, the outside world    │   │  normalizer · validator       │
        └─────────────────────────────┘   │  dedup · convergence · geo    │
                                          └───────────────────────────────┘
```

`app/domain/` performs **zero I/O** — no database, no HTTP, no subprocess, and no
`datetime.now()`: the clock is injected. It is pure functions over frozen dataclasses, which is
why the scoring rules are tested in milliseconds and why the interesting logic has no setup cost.

That claim is enforced by a tool rather than by discipline. Three `import-linter` contracts fail
CI on violation:

| Contract | What it forbids |
|---|---|
| Layers strictly ordered | `api → services → infra → domain`, never upward |
| Domain is pure | `app.domain` importing `sqlalchemy`, `fastapi`, `pydantic`, `asyncio`, `subprocess`, `httpx`, `anthropic`, `pathlib`, `yaml`, or any inner layer |
| Schemas are transport-only | `app.schemas` importing infra, services or api |

Two seams make the whole system testable offline. `ScraperCli` is a `Protocol` with
`run`/`heal`/`approve` — `BdataCli` shells out for real, `FakeCli` replays recorded envelopes
from `tests/fixtures/cli/`. `Completer` is an async callable read from `app.state.completer`, so
the Copilot's model call is a stub in tests.

---

## The rules, stated once

All of these live in `app/domain/`, and each has the reasoning written down where it is easy to
get wrong.

**Emergence score.** `S = Σ w(signal_type) · e^(−0.1 · age_days)`, with weights 3.0 for a
facility expansion, 2.0 for a research grant, 1.0 for an event. A month-old signal is worth about
5% of a fresh one, so a zone has to keep earning its position.

**Source-concentration cap — no single source type may exceed 60% of a zone's final score.** One
chatty university press office publishing weekly must not outrank a genuine convergence of a lab
opening, a grant and a meetup; that would invert the thesis of the whole project. The obvious
implementation does not enforce its own rule: clipping the dominant contribution to `total × 0.6`
with `A = 80, B = 20` yields 80, at which point `A` is 75% of the score — above the ceiling it
just applied. Solved instead: `final = min(total, others / (1 − cap))`, giving 50, with `A` at
exactly 60%. The single-source case has no solution, so it clamps to `total × cap`, reports
`confidence: LOW`, and sets `was_capped: true` — a quietly reduced score with no explanation
reads as a bug. Full derivation in
[ADR 0003](docs/adr/0003-source-concentration-cap-math.md).

**Deduplication merges, it does not discard.** Signals in the same `(city, domain)` whose titles
match at a `SequenceMatcher` ratio ≥0.85 within three days collapse into one: the earliest
survives and `evidence_urls` accumulate. The evidence panel can then say *"3 outlets reported
this — counted once"*, which is a stronger claim than a lower number with the trail thrown away.

**Fill rate is measured on raw rows, before normalization.** Measure it after, and a page whose
titles moved just yields fewer signals — a quiet under-report instead of an event someone can be
shown. Zero records is `fill_rate: 0.0`, never an undefined 1.0.

**Unparseable dates are rejected, never defaulted to now.** Defaulting to now turns stale data
into a maximum-freshness signal, which is the worst possible failure mode for a decay model.

**Zones are derived per request and never stored.** With a decay term in the score, a cached score
is a wrong score.

**Nothing is rounded inside the domain.** Rounding the score to 2 dp broke the cap invariant on
small values (`0.0123 → 0.01` reads as a 74% share). Display rounding is `DISPLAY_PRECISION = 3`
in `app/schemas/common.py`; the arithmetic stays exact.

---

## API surface

Full request/response shapes, every error code and a polling recipe are in
[`docs/API_CONTRACT.md`](docs/API_CONTRACT.md); real captured responses for every endpoint are in
[`examples/sample_signals.json`](examples/sample_signals.json), generated by running the
application rather than written by hand.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/health` | service + data + collector health |
| `GET` | `/api/zones` | filter by `city`, `domain`, `min_score` |
| `GET` | `/api/zones/{zone_id}` | `zone_id` is `slugify(city)-slugify(domain)` |
| `GET` | `/api/zones/{zone_id}/signals` | the evidence behind a zone |
| `GET` | `/api/signals`, `/api/signals/{signal_id}` | paged |
| `GET` | `/api/collectors`, `/api/collectors/{key}` | registry joined to latest health |
| `GET` | `/api/collector-runs`, `/api/collector-runs/{run_id}` | the audit log |
| `POST` | `/api/collectors/{key}/run` | `X-Admin-Key` · `202` + `run_id` |
| `POST` | `/api/collectors/{key}/heal` | `X-Admin-Key` · `202` |
| `POST` | `/api/collectors/{key}/approve` | `X-Admin-Key` · `202` |
| `POST` | `/api/chat` | Copilot, partner track |

The three admin endpoints return `202` and a poll URL rather than a result. `heal` and `approve`
block for up to 600 seconds inside the CLI, so no request handler may wait on one
([ADR 0001](docs/adr/0001-async-cli-jobs.md)). Errors are a single envelope, `{detail, code}`,
from one exception handler.

`status` and `health` answer different questions: `status: SUCCEEDED` with `health: DEGRADED` is
the *normal* result for a broken source page. Colour the dashboard by `health`; stop polling on
`status`.

---

## Security posture

| Risk | How it is removed |
|---|---|
| Shell injection through a heal prompt | `create_subprocess_exec` with an argv list. No shell exists in any code path — not escaped, absent ([ADR 0002](docs/adr/0002-argv-subprocess-no-shell.md)) |
| SSRF via a caller-supplied URL | Callers pass a **registry key**. URLs resolve server-side from committed config and never come off the wire |
| Unauthenticated repair of production extraction logic | `X-Admin-Key` compared with `secrets.compare_digest` on all three admin routes; boot refused if the key is unset or under 16 chars |
| A hung CLI holding a request forever | Explicit 660 s timeout per invocation; the process is killed and the run recorded `FAILED` |
| An AI-authored selector change applied unreviewed | `--auto-approve` is never passed. A human reads `diff_summary` and `preview_rows`, then calls `approve` ([ADR 0004](docs/adr/0004-manual-healing-only.md)) |
| Malformed collector ids reaching a process | `^c_[a-z0-9]{6,40}$` validated in the pure domain, before any argv is built |
| Secrets in the repo | `.env`, `signals.db` and `data/raw/` are gitignored; `.env.example` carries empty values |

CORS is scoped to `FRONTEND_ORIGINS` with **no** `allow_credentials=True` — this API authenticates
with a header, never a cookie.

---

## Verification

Four commands. All four pass with **no Bright Data key, no Anthropic key and no network** — that
is what the `ScraperCli` and `Completer` seams are for.

```bash
.venv/Scripts/python.exe -m ruff check . && .venv/Scripts/python.exe -m ruff format --check .
.venv/Scripts/python.exe -m mypy app
.venv/Scripts/lint-imports.exe
.venv/Scripts/python.exe -m pytest -q --cov=app --cov-report=term-missing
```

Current state: **379 tests passing, 86% coverage over 2354 statements**, `mypy --strict` clean
across 54 modules, 3 import contracts kept. `.github/workflows/ci.yml` runs all four on push.

Two notes on running the gate. `lint-imports` must be invoked as the console script —
`python -m lint_imports` does not exist. And coverage is pinned to Python 3.12's `sys.monitoring`
tracer (`core = "sysmon"`): the default C tracer loses line events across the greenlet switch
SQLAlchemy's async layer performs, so every service method appeared to stop executing at its
first `await`, reporting 62% on a module the integration tests actually cover at 80%.

What the suite actually pins down, rather than what it covers:

- **Domain** — the cap invariant over randomised contribution mixes; the specific `80/20 → 50`
  case, with the naive `80` named in a comment so nobody "simplifies" it back; the single-source
  clamp; decay monotonic in age; three outlets collapsing to one signal with three evidence URLs;
  an unparseable date rejected rather than defaulted; `c_abc; rm -rf /` rejected by the id regex;
  a 1001-character heal prompt rejected before it reaches the CLI.
- **Infra** — `run`'s bare JSON array versus the `heal` envelope; `awaiting_approval` treated as a
  success rather than a failure; malformed JSON surfacing as `FAILED` with the stderr text instead
  of a crash; registry loading and `${FIXTURE_BASE_URL}` expansion.
- **Integration** — every read endpoint's shape, paging meta and typed 422s; admin routes `401`
  without a key; `409` for disabled, unprovisioned and nothing-to-approve; and the full
  degrade → heal → approve → recover cycle end to end through real routes, real services and the
  real normalizer.
- **Security** — an AST scan over every module in `app/` asserting no shell-spawning call, no
  `shell=` argument, no `--auto-approve` literal outside a docstring, and exactly one module that
  spawns a process at all; plus the real adapter exercised with `create_subprocess_exec`
  intercepted, checking the argv it would have run.

---

## Implemented / Demonstrated / Planned

Three lists, kept separate on purpose. Overclaiming costs more than a smaller scope does.

**Implemented** — in the repository, tested, running:

- Nine-entry collector registry (`collectors/registry.yaml`) with committed creation prompts —
  eight enabled: three source types in both cities, `startup_newsroom` in San Francisco, and the
  demo collector; client input is a key, never a URL
- Async CLI adapter behind a `Protocol`: argv-only subprocess, per-command 660 s timeouts, two
  parsers for the two envelope shapes the CLI actually emits, and a fake that replays recorded runs
- In-process `JobRunner` with a concurrency semaphore; every terminal path records a state, so no
  run is left sitting in `RUNNING`
- Normalization, validation, fill-rate measurement and the six health states
- Deduplication by merge, the emergence score, the solved source-concentration cap, confidence
  tiers, and a static geo registry with deterministic marker offsets
- Ten read endpoints and three admin endpoints, one error envelope, header auth, scoped CORS
- Seed data: 54 raw rows across both cities and all four source types, normalized by the live path
- Verification: 379 tests, `mypy --strict`, three enforced import contracts, an AST security scan,
  and CI running all of it

**Demonstrated** — reproducible end to end, offline, by anyone with the repo:

- The full degradation → heal → review → approve → recovery cycle against the two committed HTML
  fixtures, as an integration test and as a scripted walkthrough
  ([`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md))
- Fill rate falling to 0.5 on a mutated page, the collector flipping to `DEGRADED`, and the
  proposed selector change being read before it is applied
- The scoring rule as a decomposable `contributions` array a judge can verify with a calculator

**Planned** — designed, deliberately not built:

- Automatic heal *triggering* that still stops at `HEALING_REVIEW` for a human. The natural next
  step; it needs a generated prompt, retry limits and a cooldown, and its demo value is already
  fully delivered by the manual path ([ADR 0004](docs/adr/0004-manual-healing-only.md))
- Scheduled runs, more cities, more source types
- A durable job queue and Alembic migrations
- Per-user credentials instead of one shared admin key

---

## Known limitations

Stated here rather than discovered by a reviewer.

- **Collectors are not provisioned in this repository.** Every `collector_id` in
  `collectors/registry.yaml` is `PENDING`; the real server-generated `c_*` ids are captured from
  `brightdata scraper create` output and committed at build time. A `PENDING` entry shows as
  unprovisioned and refuses to run with `409 collector_not_provisioned` rather than failing
  obscurely inside the CLI.
- **The healing demo mutates a hosted fixture, not a live third-party site.** Waiting for
  `news.berkeley.edu` to change its markup is not a demo. The two fixtures differ only in
  selectors and are served over GitHub Pages, because runs execute on Bright Data infrastructure
  and cannot reach `localhost`.
- **Source coverage is asymmetric: four source types in San Francisco, three in Delhi.**
  `startup_newsroom` was the one category that had to be verified rather than assumed, and only the
  SF candidate cleared the bar. [The San Francisco Standard's startups tag](https://sfstandard.com/tag/startups/)
  prints 10 dated items with `/YYYY/MM/DD/` in every URL and covers a single city, so its
  `city_hint` fallback is honest. Three Indian candidates were rejected — `yourstory.com` returns
  403 to a plain fetch, and `inc42.com` and `entrackr.com` list dated items that name no city at
  all. `techcrunch.com/category/startups` was rejected for the opposite reason: it loads fine and
  is dated, but it is a global feed, so requiring `city` would hold it at `DEGRADED` forever while
  a city hint would relabel a Tokyo funding round as San Francisco. `startup_news_delhi` therefore
  ships `enabled: false` with the tested candidates recorded in `collectors/registry.yaml`. The
  consequence to read carefully: **SF zone scores can draw on one more independent source type
  than Delhi's**, so cross-city score comparison is not like-for-like.
- **Runs are triggered manually.** There is no scheduler.
- **Healing is manual by design**, so a degraded collector stays degraded until someone acts.
- **The job runner is in-process** and holds no state across a restart. A run interrupted by a
  restart is not resumed.
- **`create_all`, not migrations.** Schema changes mean recreating `signals.db`.
- **One shared admin key.** No users, no roles, no per-caller audit beyond the run log.
- **Two cities.** The geo registry is a static table; there is no geocoding service, which is what
  makes tests deterministic and also what bounds coverage.
- **Zone scores are derived per request**, so a large signal corpus would need the caching that the
  decay term currently rules out.
- **`mode` and `is_social_media` were dropped, not stubbed.** Both appeared in earlier planning
  notes without a definition. An undefined field on a public contract is worse than an absent one.

> The MVP supports four predefined public source types across Delhi and San Francisco — three of
> them in both cities and `startup_newsroom` in San Francisco only — manually triggered collector
> runs, schema-based degradation detection, and an approval-gated Scraper Studio healing workflow.

---

## Documentation map

| Read this | If you are |
|---|---|
| [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) + [`examples/sample_signals.json`](examples/sample_signals.json) | building the map frontend |
| [`docs/COPILOT_BRIEF.md`](docs/COPILOT_BRIEF.md) | building the Signal Copilot |
| [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) | reproducing the self-healing run |
| [`docs/adr/`](docs/adr/) | asking why a decision went the way it did |
| [`EXECUTION.md`](EXECUTION.md) | picking the work up, or checking a verified fact |

The four ADRs, each written at the point the obvious answer turned out to be wrong:

1. [Async CLI jobs](docs/adr/0001-async-cli-jobs.md) — why admin endpoints return `202` instead of
   a result
2. [argv subprocess, no shell](docs/adr/0002-argv-subprocess-no-shell.md) — why a heal prompt
   containing `rm -rf /` is harmless
3. [Source-concentration cap math](docs/adr/0003-source-concentration-cap-math.md) — why the
   obvious cap does not cap
4. [Manual healing only](docs/adr/0004-manual-healing-only.md) — why `--auto-approve` appears
   nowhere in this codebase

## Layout

```
app/
  main.py            app factory + lifespan; no module-level `app`
  config.py          pydantic-settings; refuses to boot on a weak ADMIN_API_KEY
  domain/            PURE — models · enums · dates · normalizer · validator
                     · dedup · convergence · geo
  infra/
    cli/             protocol · bdata · parsers · fake
    db/              base · models · session · repositories
    registry.py      registry.yaml loader + ${FIXTURE_BASE_URL} expansion
  services/          clock · ingest · healing · zones · signals · collectors
                     · jobs · copilot · errors
  schemas/           pydantic DTOs only, transport-shaped
  api/               deps · security · errors · routes/
  seed.py            python -m app.seed
tests/               unit/domain · unit/infra · integration/api · security
                     · fixtures/cli
collectors/          registry.yaml + prompts/*.txt, verbatim
fixtures/            newsroom_v1.html · newsroom_v2_mutated.html → GitHub Pages
```

Built for **Into the Scrape-Verse** (WeMakeDevs × Bright Data).
