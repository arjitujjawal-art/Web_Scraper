# EXECUTION.md — Signal Atlas backend, operational plan

The approved plan in the form you work from. Verified facts, the order to do things in, and
the checks that must pass before anything is called done.

- **What it is:** a backend that detects *signal convergence* — independent early public
  signals (university research, incubator news, startup newsrooms, tech events) clustering on
  the same city and technology domain — scores each cluster, and serves it as an emerging
  opportunity zone for a map.
- **Cities:** Delhi (NCR) and San Francisco (Bay Area). **Not Pune** — older planning notes
  say otherwise and they are wrong.
- **Ownership:** this repository is the backend. The frontend is other teammates'. The Signal
  Copilot is a partner's, briefed in [`docs/COPILOT_BRIEF.md`](docs/COPILOT_BRIEF.md).
- **There is a clean-code award**, so architecture is a scored deliverable. Every rule below
  that sounds like overhead exists because a judge can check it.

## 1. Verified facts that changed the plan

Everything in this section was checked against the live CLI reference, not remembered. Each
one invalidated something an earlier draft assumed.

**Every CLI command in the original planning documents was wrong.**

| Draft said | Reality |
|---|---|
| `bdata scraper run --urls "URL" --name "c_startup_news"` | `brightdata scraper run <collector_id> [url]` — the id is **positional** |
| `--name` selects the collector | `--name` is a job *label* on `run`, a template name on `create`. Never a selector |
| you choose `collector_id` | ids are server-generated `c_*`, e.g. `c_mp3tuab31lswoxvpws`; capture them from `create` output |
| `heal <id> "<feedback>"` | correct — prompt positional, **hard-capped at 1000 chars** |
| nothing about `create`'s prompt length | `create <url> <description>` caps the **description at 500 chars** — verified on CLI 0.3.5. All five original prompt files were 860–1317 chars, so **all nine `create` calls would have been rejected**. Rewritten to 484–500; `tests/unit/infra/test_registry.py` now fails if one grows back |

Consequence: `collectors/registry.yaml` mapping logical keys → real `c_*` ids is
**mandatory**, not a nicety.

**A 30-second subprocess timeout would break healing entirely.** `heal` and `approve` default
to 600 s; `run` to 600 s single-URL and 3600 s batch; `create` takes 5–25 minutes. Synchronous
`POST /heal` is impossible → async job model
([ADR 0001](docs/adr/0001-async-cli-jobs.md)). Our timeouts are 660 s.

**`run --json` and `create/heal/approve --json` return different shapes.** `run` emits a bare
JSON array of best-effort rows with **missing keys omitted, not nulled**.
`create`/`heal`/`approve` emit an envelope: `collector_id`, `status`, `completed_steps`,
`view_url`, `created_at`, plus `error` on failure, plus `preview_result`/`diff_summary`/
`next_step` when gated. Two parsers, two result types — `app/infra/cli/parsers.py`.

**There is no `scraper list` and no `scraper status`.** `GET /api/collectors` is served from
our own database joined to the registry, not from a CLI passthrough.

**`localhost` fixtures cannot work.** Runs execute on Bright Data infrastructure and cannot
reach your machine. Fixtures go on **GitHub Pages** from the public submission repo — free,
and more reproducible for judges.

**AI-Flow allows 3 concurrent `create`/`heal` jobs** (429 + backoff beyond). Collector
creation starts Day 1 hour 1 and is serialised.

**`python` on this machine is KiCad's 3.9.14.** Use `py -3.12` or `.venv/Scripts/python.exe`,
never bare `python`.

**The reviewed source-concentration cap did not enforce its own rule.** Corrected in
[ADR 0003](docs/adr/0003-source-concentration-cap-math.md).

## 2. Non-negotiable design rules

1. **`app/domain/` performs zero I/O.** No DB, no HTTP, no subprocess, no `datetime.now()` —
   the clock is injected. Pure functions over frozen dataclasses.
2. **Import direction is enforced by a tool.** Three `import-linter` contracts: layers
   `api → services → infra → domain`; domain forbidden from importing `sqlalchemy`, `fastapi`,
   `pydantic`, `asyncio`, `subprocess`, `httpx`, `anthropic`, `pathlib`, `yaml` or any inner
   layer; schemas forbidden from importing infra, services or api. `lint-imports` fails CI.
3. **The CLI is behind a `Protocol`.** `ScraperCli` with `run`/`heal`/`approve`; `BdataCli`
   real, `FakeCli` replaying recorded envelopes. The **entire pipeline is testable with no API
   key and no network**.
4. **No business logic in route handlers.** Parse, call one service, return a schema. Over
   ~15 lines means logic belongs in a service.
5. **Client input never becomes a URL or a shell token.** Callers pass a registry key; URLs
   resolve server-side from committed config
   ([ADR 0002](docs/adr/0002-argv-subprocess-no-shell.md)).
6. **One source of truth per rule.** The Copilot calls the same services the REST API does and
   contains no SQL and no scoring maths.
7. **No dead code, no dead schema.** `is_social_media` and `mode` are dropped, not stubbed.
   No auto-heal ([ADR 0004](docs/adr/0004-manual-healing-only.md)).

## 3. Layout as built

```
app/
  main.py            app factory + lifespan; no module-level `app`
  config.py          pydantic-settings; refuses to boot with a weak ADMIN_API_KEY
  domain/            PURE — models, enums, dates, normalizer, validator, dedup,
                     convergence, geo
  infra/
    cli/             protocol.py · bdata.py · parsers.py · fake.py
    db/              base · models · session · repositories
    registry.py      collectors/registry.yaml loader, ${FIXTURE_BASE_URL} expansion
  services/          clock · ingest · healing · zones · signals · collectors · jobs
                     · copilot · errors
  schemas/           pydantic DTOs only, transport-shaped
  api/               deps · security · errors · routes/{health,zones,signals,
                     collectors,collector_runs,admin,chat}
  seed.py            python -m app.seed
tests/
  unit/domain/       fast, pure, the bulk of the suite
  unit/infra/        parsers, registry, FakeCli
  integration/api/   httpx ASGI + in-memory sqlite + FakeCli
  security/          AST scan over app/ + intercepted subprocess
  fixtures/cli/      recorded envelopes
collectors/          registry.yaml + prompts/*.txt (verbatim, for judges)
scripts/             provision_collectors.sh — batched `scraper create`, ids captured
fixtures/            newsroom_v1.html · newsroom_v2_mutated.html → GitHub Pages
seed/signals_seed.json
examples/sample_signals.json   generated from the real app
docs/                API_CONTRACT · COPILOT_BRIEF · DEMO_SCRIPT · adr/0001-0004
```

54 modules under `app/`, 23 test modules.

## 4. Setup

```bash
npm install -g @brightdata/cli
brightdata login --api-key <key>
brightdata --version          # >= 0.3.2 — heal/approve landed in 0.3.1
```

```bash
py -3.12 -m venv .venv
source .venv/Scripts/activate
python -V                     # must print 3.12.x
pip install -r requirements.txt -r requirements-dev.txt
```

Copy `.env.example` → `.env` and fill in. `ADMIN_API_KEY` must be ≥16 chars — the app
**refuses to boot** without it, because an unset secret must never silently mean "open":

```bash
py -3.12 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Never commit `.env`, `signals.db`, or `data/raw/`. `.gitignore` covers all three.

```bash
.venv/Scripts/python.exe -m app.seed
py -3.12 -m uvicorn app.main:create_app --factory --reload
```

`--factory` is required: there is no module-level `app`, because building the application at
import time means settings are read and a database engine is constructed during collection —
which makes the test suite depend on your `.env`.

## 5. Collectors

Four source types, two cities. ✅ = fetched during planning; loaded publicly with titles and
dates, no login.

| key | source_type | target |
|---|---|---|
| `univ_research_delhi` | `university_research` | ✅ `home.iitd.ac.in/research-all.php` |
| `univ_research_sf` | `university_research` | ✅ `news.berkeley.edu/category/research/` |
| `incubator_news_delhi` | `incubator_news` | ✅ `home.iitd.ac.in/startup-all.php` |
| `incubator_news_sf` | `incubator_news` | ✅ `ycombinator.com/blog` |
| `tech_events_delhi` | `tech_event` | ✅ Eventbrite, New Delhi |
| `tech_events_sf` | `tech_event` | ✅ Eventbrite, San Francisco |
| `startup_news_delhi` | `startup_newsroom` | no candidate cleared the bar — `enabled: false` |
| `startup_news_sf` | `startup_newsroom` | ✅ `sfstandard.com/tag/startups/` |
| `demo_newsroom` | `startup_newsroom` | the two committed fixtures |

Notes from those fetches, which feed straight into the creation prompts:

- Berkeley prints **no date line** — the date is in the URL path (`/2026/08/21/`). The prompt
  must say so.
- IIT Delhi cards show a `DD / Mon` pair; item URLs are `show.php?id=<n>&in_sections=Research`.
- Eventbrite gives **locality plus venue** ("Soma", "Gurugram", "Santa Clara") — this is what
  makes the map spatially interesting instead of two stacked pins.
- Eventbrite bleeds outside the filtered city (Hong Kong listings under the SF filter) and
  includes promoted results → the normalizer rejects rows whose resolved city is not
  Delhi/NCR or SF/Bay.

`startup_newsroom` was the one category that had to be verified rather than assumed. Bar: loads
without login, ≥10 dated items, title + date + something location-bearing. Checked 2026-08-23:

| candidate | result |
|---|---|
| `sfstandard.com/tag/startups/` | 10 dated items, `/YYYY/MM/DD/` in every URL, single-city outlet → **accepted** |
| `techcrunch.com/category/startups/` | 30 dated items, loads fine — but a global feed. `city` is absent from most rows, so requiring it pins the collector at `DEGRADED`, and a `city_hint` fallback would relabel a Tokyo funding round as San Francisco → rejected as wrong data, not a broken page |
| `yourstory.com/category/startups` | `403` to a plain fetch → rejected |
| `inc42.com/buzz` | 12 dated items, a city named in 0 → rejected |
| `entrackr.com` | 27 dated items, a city named in 0 → rejected |

So **SF has four source types and Delhi three**. Indian startup listings print funding amounts, not
localities; the choice was three types in Delhi or a hint that invents a city, and the hint is the
one that corrupts the map. `startup_news_sf` requires only `title, date, domain` — the listing never
prints a locality, and requiring a field a page never prints makes the health signal meaningless
rather than strict. README's limitations state the asymmetry and its effect on cross-city scores.

### Creating them

Serialise: 3 concurrent jobs per account, 5–25 minutes each, so start Day 1 morning.

Each prompt file is the `description` argument, so each one must stay **under 500 characters** —
the cap is enforced by a unit test, because the CLI only reports it after you have made the call.

```bash
brightdata scraper create "https://news.berkeley.edu/category/research/" "$(cat collectors/prompts/univ_research.txt)" --name univ-research-sf --json -o .tmp/create_univ_sf.json
```

Nine of those, batched three at a time, is a script rather than nine typed lines:

```bash
brightdata login --api-key <key>
bash scripts/provision_collectors.sh
```

It reads the registry through the application's own `load_registry`, so `${FIXTURE_BASE_URL}`
expands exactly as it does at run time and an unset placeholder fails loudly instead of being
sent to Bright Data verbatim. It skips entries that already hold a `c_*` id — so an interrupted
run resumes by re-running it — skips `enabled: false` entries, refuses any description over 500
chars before spending a job on it, writes each envelope to `.tmp/create_<key>.json`, and prints
the ids at the end. Pass keys to narrow it: `bash scripts/provision_collectors.sh demo_newsroom`.

Then copy `.collector_id` out of each envelope into `collectors/registry.yaml` and commit it.
Those `c_*` ids are direct evidence for the "Use of Scraper Studio" criterion — a judge can
read them. Until an entry is filled in, `collector_id: PENDING` means the collector shows as
unprovisioned on the dashboard and refuses to run with `409 collector_not_provisioned`, rather
than failing inside the CLI with something obscure.

### Hosting the two fixtures

Runs execute on Bright Data infrastructure, so the healing demo's fixtures must be publicly
reachable. GitHub Pages from the submission repo itself, root folder — `.nojekyll` is committed
so the HTML is served byte-for-byte rather than run through Jekyll:

```bash
git init && git add -A && git commit -m "Signal Atlas backend"
gh repo create signal-atlas --public --source . --push
gh api -X POST repos/:owner/signal-atlas/pages -f source.branch=main -f source.path=/
```

Then confirm both files load and put the base URL in `.env`:

```bash
curl -sI https://arjitujjawal-art.github.io/signal-atlas/fixtures/newsroom_v1.html | head -1
```

```
FIXTURE_BASE_URL=https://arjitujjawal-art.github.io/signal-atlas/fixtures
```

`demo_newsroom` must be created **after** that variable is set — its `create` URL is
`${FIXTURE_BASE_URL}/newsroom_v1.html`, and the loader refuses to expand an unset placeholder.

## 6. Domain rules, in one place

**Fill rate** = populated required cells ÷ (rows × required fields), measured on the **raw**
rows before normalization. Measure after and a page whose titles moved just yields fewer
signals — a quiet under-report instead of an event anyone can be shown. Zero records is
`fill_rate: 0.0`, never an undefined 1.0.

**Health:** `HEALTHY` ≥0.8 · `DEGRADED` <0.8 or empty · `HEALING_REVIEW` (heal returned
`awaiting_approval`) · `HEALED` (approve returned `done`) · `FAILED` (CLI error/timeout) ·
`UNKNOWN` (never run).

**Dedup:** group by `(city, domain)`, collapse titles with a `SequenceMatcher` ratio ≥0.85
within 3 days. **Merge, don't discard** — the earliest survives and `evidence_urls`
accumulate, so the evidence panel can say *"3 outlets reported this — counted once"*.

**Score:** `S = Σ w(signal_type) · e^(−0.1 · age_days)`, weights 3.0 facility / 2.0 grant /
1.0 event, then the 60% source-concentration cap
([ADR 0003](docs/adr/0003-source-concentration-cap-math.md)). `HIGH`/`MEDIUM`/`LOW` confidence
at ≥3 / 2 / 1 distinct source types. Nothing is rounded in the domain; display rounding is
`DISPLAY_PRECISION = 3` in `app/schemas/common.py`.

**Dates:** one parsing path — `datetime`, ISO strings, and IIT Delhi's `DD / Mon`.
Unparseable dates are **rejected at normalization, never defaulted to now**: a default-to-now
turns stale data into a maximum-freshness signal, the worst possible failure for a decay model.

**Geo:** static registry in `app/domain/geo.py` — no geocoding API, no key, deterministic in
tests. Delhi/NCR and Bay Area localities plus city centres as fallback; a signal that resolves
only to a city gets a deterministic radial offset keyed by domain so markers do not stack.

**Zones are derived per request, never stored.** The decay term means a cached score is a
stale score.

## 7. Verification gate

All four must be green before anything is called done. **All four run with no Bright Data key,
no Anthropic key and no network** — that is the point of the `ScraperCli` and `Completer`
seams.

```bash
.venv/Scripts/python.exe -m ruff check . && .venv/Scripts/python.exe -m ruff format --check .
.venv/Scripts/python.exe -m mypy app
.venv/Scripts/lint-imports.exe
.venv/Scripts/python.exe -m pytest -q --cov=app --cov-report=term-missing
```

Current state: **379 passing, 86% coverage over 2354 statements**, mypy clean over 54 modules,
3 import contracts kept.

Note `lint-imports` is invoked as the console script — `python -m lint_imports` does not exist.
Coverage is pinned to `core = "sysmon"` in `pyproject.toml`: the default C tracer loses line
events across SQLAlchemy's greenlet switch, so service methods read as stopping at their first
`await` and the reported figure was 1–19 points low per module.

What the suite actually pins down:

- **Unit / domain** — the cap invariant over randomised mixes; the `80/20 → 50` case; the
  single-source clamp; decay monotonic in age; dedup collapsing 3 outlets into 1 signal with 3
  evidence URLs; an unparseable date rejected rather than defaulted; `collector_id` regex
  rejecting `c_abc; rm -rf /`; a 1001-character heal prompt rejected.
- **Unit / infra** — `run`'s bare array vs the `heal` envelope; `awaiting_approval` treated as
  a success, not a failure; malformed JSON surfacing as `FAILED` with the stderr text rather
  than a crash; registry loading and `${FIXTURE_BASE_URL}` expansion.
- **Integration** — every read endpoint's shape, paging meta and typed 422s; admin routes
  `401` without `X-Admin-Key`; `409` for disabled, unprovisioned and nothing-to-approve; the
  full degrade → heal → approve → recover cycle end to end through real routes, real services
  and the real normalizer.
- **Security** — an AST scan over all of `app/` (no shell spawner, no `shell=`, no
  `--auto-approve` literal outside a docstring, exactly one module spawning a process) plus the
  real adapter with `create_subprocess_exec` intercepted.

`.github/workflows/ci.yml` runs all four on push. A green badge on a public repo is the
cheapest credibility available.

Manual smoke, once collectors exist:

```bash
curl -sS localhost:8000/api/health | jq .
curl -sS "localhost:8000/api/zones?city=Delhi" | jq '.items[0]'
```

then one real `POST /api/collectors/demo_newsroom/run` with the admin key.

## 8. Build order

Ordered by what unblocks other people and what fails loudest if left late.

| Day | Work |
|---|---|
| 1 | `brightdata login`; **fire all `create` jobs first** (5–25 min each, 3 at a time); verify the `startup_news` candidates; scaffold repo, `pyproject.toml`, CI, domain dataclasses + enums; capture `c_*` ids into `registry.yaml` |
| 2 | `infra/cli` (argv exec, timeouts, two parsers, `FakeCli` + recorded fixtures); `JobRunner`; DB models + repositories; **fixtures onto GitHub Pages** |
| 3 | Normalizer, validator, health states; ingest service; admin routes with auth; **rehearse the full heal demo end to end** |
| 4 | Dedup, convergence, geo, fully unit-tested; seed Delhi/SF signals; `GET /zones` and `/signals` live for the frontend |
| 5 | `docs/API_CONTRACT.md` finalised and handed over; `GET /collectors`, `/collector-runs`; error envelope; real collector runs wired into the pipeline |
| 6 | README with the implemented/demonstrated/planned split; ADRs; `examples/sample_signals.json`; coverage pass; **hand `COPILOT_BRIEF.md` to the partner** — it is self-contained from Day 1, so send it earlier if she is idle |
| 7 | Copilot merge **only if green**; demo video; submission checklist |

**Cut order if time runs short:** Copilot → the 4th source type → seed breadth.
**Never cut:** argv subprocess + timeouts, admin auth, dedup, the source cap, the reproducible
heal demo.

## 9. Handover

| Who | Document |
|---|---|
| Frontend teammates | [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) + [`examples/sample_signals.json`](examples/sample_signals.json) — real captured responses for every endpoint |
| Copilot partner | [`docs/COPILOT_BRIEF.md`](docs/COPILOT_BRIEF.md) — standalone, sendable as-is |
| Judges | [`README.md`](README.md), [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md), [`docs/adr/`](docs/adr/) |

Both handover documents are written to be read without this file and without any
conversation. `examples/sample_signals.json` is **generated by running the application** under
an ASGI transport, not hand-written, so every field name, code and number in it is real —
regenerate it whenever a response shape changes.

## 10. Honesty rules for the README

Three explicit lists — **Implemented**, **Demonstrated**, **Planned** — plus Known
Limitations naming: fixture-hosted healing demo rather than a live site mutation, manually
triggered runs, two cities, four (or three) source types, an in-process job runner with no
persistence across restart, `create_all` rather than migrations, a single shared admin key, and
zone scores derived per request rather than cached.

Overclaiming costs more than a smaller scope. The sentence that fits:

> The MVP supports four predefined public source types across Delhi and San Francisco,
> manually triggered collector runs, schema-based degradation detection, and an
> approval-gated Scraper Studio healing workflow.


