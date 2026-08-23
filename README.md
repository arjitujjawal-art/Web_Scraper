<div align="center">

# 🗺️ Signal Atlas
### We don't scrape opportunities. We scrape the signals that reveal where opportunities are about to emerge.

*A self-healing, predictive signal-convergence engine built on Bright Data Scraper Studio.*
*Built for **Into the Scrape-Verse** — WeMakeDevs × Bright Data*

[![Tests](https://img.shields.io/badge/tests-391%20passing-2ea44f?style=for-the-badge)]()
[![mypy](https://img.shields.io/badge/mypy-strict%20%7C%2054%20modules-3178C6?style=for-the-badge)]()
[![ruff](https://img.shields.io/badge/ruff-clean-000000?style=for-the-badge)]()
[![import--linter](https://img.shields.io/badge/architecture-3%20contracts%20kept-A855F7?style=for-the-badge)]()
[![Bright Data](https://img.shields.io/badge/Bright%20Data-Scraper%20Studio-1D4ED8?style=for-the-badge)]()
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)]()

</div>

---

## Table of Contents

1. [Why This Exists](#-why-this-exists)
2. [What It Actually Does (and Doesn't)](#-what-it-actually-does-and-doesnt)
3. [System Architecture](#️-system-architecture)
4. [The Four Ways This Uses Bright Data Scraper Studio](#-the-four-ways-this-uses-bright-data-scraper-studio)
5. [Self-Healing: How It Actually Works](#-self-healing-how-it-actually-works)
6. [The Math](#-the-math)
7. [Signal Copilot](#-signal-copilot)
8. [API Reference](#-api-reference)
9. [Repository Structure](#-repository-structure)
10. [Engineering Principles We Refused to Break](#-engineering-principles-we-refused-to-break)
11. [Running It Yourself](#-running-it-yourself)
12. [Reproducing the Self-Healing Demo](#-reproducing-the-self-healing-demo)
13. [What's Verified vs. What's Not](#-honesty-section-whats-verified-vs-whats-not)
14. [Judging Criteria, Mapped Directly](#-judging-criteria-mapped-directly)

---

## 🎯 Why This Exists

Every job board, every market-intel dashboard, every "opportunity tracker" on the internet does the same thing: it shows you what's **already been posted**. By the time a role is listed, or a tender is public, the interesting part — the *decision* to expand, to hire, to fund, to build — already happened weeks earlier, in a press release nobody indexed, a university lab bulletin nobody read, a zoning filing nobody cross-referenced against the startup newsroom next door.

**Signal Atlas** watches those early signals instead. It ingests university research announcements, incubator portfolio news, and public tech events across two live target ecosystems — **Delhi/NCR** and **San Francisco/Bay Area** — normalizes them into one schema, and looks for **convergence**: multiple independent sources pointing at the same city and the same technical domain within the same window. When that convergence crosses a threshold, it's an early signal of an emerging hub — not a guess, a computed, decayed, source-capped score you can point to and defend.

And because the web that feeds this pipeline changes its layout constantly, the whole thing is wired end-to-end to **Bright Data Scraper Studio's** self-healing loop: `create → run → heal → approve`, no redeploy, same collector ID, zero application code touched.

---

## 🔍 What It Actually Does (and Doesn't)

This section exists because we'd rather tell you exactly what we built than let a slide deck imply something bigger.

| It does | It does not |
|---|---|
| Ingests early, pre-hiring signals (labs, grants, incubator news, tech events) across **Delhi/NCR** and **SF/Bay Area** | Pretend to cover every city on Earth |
| Computes a defensible, source-capped, time-decayed **Emergence Score** per (city, domain) | Invent a score when there's no data — unknown cities get an honest "not monitored" answer |
| Runs a real, reproducible **self-heal loop** against Bright Data Scraper Studio, gated by human approval | Auto-heal silently — the approval step is a deliberate product decision, not a missing feature |
| Lets a user paste **any public URL** and get it scraped, normalized, and folded into the map on the spot | Require you to wait for a scheduled crawl to see new data |
| Also surfaces **traditional active job postings** as a separate map layer, on request | Blend job listings into the emergence math — that would contaminate a predictive signal with a lagging one |
| Answers natural-language questions through a database-grounded **Signal Copilot** | Let the chatbot invent numbers that disagree with the map |

---

## 🏗️ System Architecture

Signal Atlas is a layered FastAPI backend with a **pure domain core** — the part that computes scores, validates payloads, and deduplicates signals never touches a database, a subprocess, or the network. That boundary is enforced by `import-linter`, not by convention.

```mermaid
graph TD
    classDef default fill:#0F172A,stroke:#334155,stroke-width:1px,color:#F8FAFC;
    classDef pure fill:#064E3B,stroke:#059669,stroke-width:1.5px,color:#34D399;
    classDef alert fill:#7F1D1D,stroke:#F87171,stroke-width:1.5px,color:#FCA5A5;
    classDef gate fill:#312E81,stroke:#6366F1,stroke-width:1.5px,color:#A5B4FC;

    subgraph Sources ["PUBLIC SOURCES · Delhi and SF"]
        A["University Research<br/>IIT Delhi and UC Berkeley"]
        B["Incubator News<br/>IIT Delhi Startups and Y Combinator"]
        C["Tech Events<br/>Eventbrite Delhi/NCR and Bay Area"]
        D["Startup Newsroom<br/>SF Standard verified · Delhi none cleared bar"]
    end

    A & B & C & D -->|"brightdata scraper run collector_id url"| E["Async CLI Bridge<br/>argv exec, never shell=True"]

    subgraph Gate ["VALIDATION AND SELF-HEALING GATE"]
        E --> F["Payload Validator<br/>pure domain"]
        F --> G{"Fill Rate at least 80%?"}
        G -->|Yes| H[("Signal Repository")]
        G -->|No| I["DEGRADED"]:::alert
        I --> J["brightdata scraper heal id feedback"]:::gate
        J --> K["awaiting_approval<br/>plus diff preview"]:::gate
        K --> L["brightdata scraper approve id"]:::gate
        L -->|same collector_id| E
    end

    subgraph Domain ["PURE DOMAIN CORE — zero I/O"]
        H --> M["Dedup<br/>SequenceMatcher greater than 0.85, merge not discard"]:::pure
        M --> N["Convergence Engine<br/>time-decay plus source-cap invariant"]:::pure
        N --> O["Geo Resolver<br/>static Delhi/SF locality registry"]:::pure
    end

    subgraph Surface ["PRESENTATION"]
        O --> P["REST API :8000<br/>zones, signals, jobs"]
        P --> Q["Spatial Map"]:::pure
        P --> R["Signal Copilot<br/>5 tools, DB-grounded, zero SQL"]:::pure
    end

    subgraph AdHoc ["ON-DEMAND PATH"]
        S["User pastes any URL"] --> T{"Domain matches<br/>a registered collector?"}
        T -->|Fast path| E
        T -->|Slow path| U["brightdata scraper create<br/>url, prompt under 500 chars"]
        U --> E
    end
```

**Layer discipline, enforced by tooling, not trust:**

```
api/  →  services/  →  infra/  →  domain/
```

`domain/` cannot import `infra`, `api`, or `services` — this is a CI-checked contract, not a style guideline. If a pull request violates it, the build fails before a human has to notice.

---

## 🛠️ The Four Ways This Uses Bright Data Scraper Studio

### 1. The Standing Fleet
Each source type is a collector provisioned once via natural-language prompt, then re-run on demand:

```bash
brightdata scraper create \
  "https://news.berkeley.edu/category/research/" \
  "Extract title, publication date from the URL path, summary, and technology domain from research announcement cards." \
  --name univ-research-sf --json
```

Bright Data returns a server-generated ID (`c_*`) — never chosen by us — which is recorded in a committed `collectors/registry.yaml`. Every one of those IDs in the repo is direct, checkable evidence that the collector actually exists.

### 2. Self-Healing on the Standing Fleet
Covered in detail below — the centerpiece of the "reliability" criterion.

### 3. Ad-Hoc / One-Stop Scraping — "paste any URL"
A user (or the Copilot) hands over an arbitrary public URL. The backend routes it intelligently:

- **Fast path** — if the URL's domain already matches a registered collector, we reuse it immediately: `brightdata scraper run <existing_collector_id> <new_url>`. Seconds, not minutes.
- **Slow path** — if it's a domain we've never seen, we provision a brand-new collector on the fly from a generated prompt (capped and truncated to the CLI's **500-character** limit — we hit this limit for real during provisioning and fixed it, see [§13](#-honesty-section-whats-verified-vs-whats-not)), then run it immediately.

Either way, the result is validated through the same `PayloadValidator`, deduplicated through the same engine, and folded into the same emergence score as everything else — one pipeline, not a special case.

### 4. Active Jobs — a separate, honest layer
Traditional job vacancies are real and useful, but they are **lagging indicators** — the opposite of what emergence scoring is built to measure. Rather than blend them in and quietly corrupt the math, they live in their own `job_postings` table, served by their own `GET /api/jobs` endpoint, and rendered as a **separate map layer** the user toggles on. The Copilot can answer "show me active jobs in Noida" precisely because that question is *not* the same question as "why is Delhi/AI-ML converging."

---

## 🔁 Self-Healing: How It Actually Works

The CLI's real behavior — not the version every early spec draft got wrong:

| Assumption in early drafts | Verified reality |
|---|---|
| `--name` selects a collector to run | `--name` is a job label on `run`, a template name on `create` — never a selector |
| Collector ID is something we choose (`c_startup_news`) | ID is **server-generated** (`c_mp3tuab31lswoxvpws`), captured from the `create` response and stored in the registry |
| `heal`/`approve` complete in ~30 seconds | They can take up to **600 seconds**; `create` can take **5–25 minutes** — this forces every admin action to be an **async job** (`202 Accepted` + polling), never a blocking HTTP call |
| Test fixtures can live on `localhost` | Bright Data's crawlers run on **remote cloud infrastructure** — they cannot resolve a developer's loopback address. Fixtures are hosted on **GitHub Pages** instead, so the entire demo is publicly reproducible by anyone, including a judge, with no local server running |

**The actual 8-step loop, reproducible end-to-end:**

```text
1. RUN baseline           → newsroom_v1.html               → HEALTHY, fill rate 1.0
2. RUN same collector     → newsroom_v2_mutated.html       → title/city missing
3. Validator computes fill rate below 0.80                 → DEGRADED
4. POST /heal  (admin-key gated, plain-English feedback, up to 1000 chars)
5. CLI returns  status: "awaiting_approval"  + diff_summary + preview_result
6. POST /approve                                            → status: "done"
7. RUN the mutated URL again — same collector_id, zero app code changed
8. HEALTHY again → map re-renders with restored signals
```

Healing is **manual, not automatic**, by deliberate design (see `ADR 0004`): the pipeline flags `DEGRADED` and waits for a human (or a judge, live) to trigger the repair. This keeps the failure visible instead of silently patching over it before anyone can watch it happen — which is the entire point of a *demo*.

---

## 📐 The Math

Signals are grouped by `(city, domain)` and decayed over time. Weight depends on how strong a leading indicator the signal type is:

$$S_{emergence}(city, domain) = \sum_{i=1}^{N} w(type_i) \cdot e^{-\lambda \cdot t_i}$$

| Symbol | Meaning |
|---|---|
| $w(type_i)$ | `3.0` facility/lab expansion · `2.0` research grant/partnership · `1.0` meetup/tech event |
| $t_i$ | age of the signal in days |
| $\lambda$ | `0.1` — roughly a 30-day effective window |

**The source-concentration cap — corrected.** The original rule ("no source type may exceed 60% of the score") is easy to state and easy to implement wrong. Clipping the dominant contributor to `total × 0.6` doesn't actually enforce a 60% *share* — with contributions A=80, B=20, that clip yields a final score of 80, where A is now **75%** of it. The invariant that actually holds:

$$\text{Final} = \min\left(\text{Total},\ \frac{\text{Other Sources}}{1 - 0.6}\right)$$

With A=80, B=20 this correctly yields **50**, where A's share is exactly 60%. This is asserted by a property-based test over randomized inputs — `max_source_share(result) ≤ 0.6 + ε` — not just claimed in a comment. The single-source edge case (`others == 0`, no solution exists under the cap) is handled explicitly rather than left to divide by zero, and the resulting zone is marked low-confidence.

**Deduplication merges, it doesn't discard.** If three outlets report the same facility opening within a 3-day window (`SequenceMatcher` title similarity > 0.85), the signal is counted once — but all three source URLs are retained as evidence. The "why is this flagged" panel can then say *"three independent outlets reported this"*, which is a stronger sentence to hand a judge than a silently dropped duplicate.

**Confidence** is reported alongside every score: `HIGH` (≥3 distinct source types), `MEDIUM` (2), `LOW` (1) — so the map can visually distinguish a real multi-source convergence from one chatty feed.

---

## 🤖 Signal Copilot

A conversational layer that answers in natural language but **contains no SQL and no scoring arithmetic of its own** — it calls the exact same services the REST API calls, so a chat answer can never disagree with what the map shows.

| Tool | What it queries | Answers questions like |
|---|---|---|
| `search_signals` | Predictive early signals (labs, grants, events) | *"What's driving activity in Delhi's AI/ML scene?"* |
| `get_emergence_score` | Live, decayed, source-capped score for a city/domain | *"Why is San Francisco flagged for Robotics — show the math"* |
| `search_active_jobs` | The separate `job_postings` table | *"Any open roles in Noida right now?"* |
| `scrape_custom_url` | Triggers the ad-hoc fast/slow-path scraper live, mid-conversation | *"Scrape this article and tell me what it means for Delhi"* |
| `get_scraper_fleet_health` | Real-time collector fill rates and health states | *"Is anything broken right now?"* |

**Guardrails that were specifically designed against a real failure mode.** An early draft of this feature answered *every* question with a fixed city and a hardcoded score of `8.42`, regardless of what was asked. The current implementation validates the requested city against what's actually in the database — an unrecognized city gets an honest *"Signal Atlas doesn't monitor that city"*, never a silently substituted answer. Every claim in a Copilot response is grounded in a tool result and cited by `signal_id`, deep-linkable back to `GET /api/signals/{signal_id}`.

**Cache-first, actively-crawling.** When asked about jobs in a specific locality, the Copilot returns whatever's already in the database instantly (milliseconds), while a live Bright Data crawl runs in the background to pull anything new — the answer isn't blocked on a 30-second scrape, but the data behind it keeps getting fresher.

---

## 📡 API Reference

```
GET  /api/health
GET  /api/zones?city=&domain=&min_score=
GET  /api/zones/{zone_id}
GET  /api/zones/{zone_id}/signals
GET  /api/signals?city=&domain=&source_type=&limit=&offset=
GET  /api/signals/export                     → downloadable structured JSON dataset
GET  /api/jobs?city=&domain=&keyword=        → traditional job postings, separate layer
GET  /api/collectors                          → registry + live health per collector
GET  /api/collector-runs/{run_id}
POST /api/collectors/{key}/run       [X-Admin-Key]  → 202, poll for result
POST /api/collectors/{key}/heal      [X-Admin-Key]  → 202, poll for result
POST /api/collectors/{key}/approve   [X-Admin-Key]  → 202, poll for result
POST /api/collectors/ad-hoc                   → paste any public URL, get it scraped now
POST /api/chat                                → Signal Copilot
```

Every JSON response follows one normalized schema, and a populated example lives at `/examples/sample_signals.json` — the structured-output requirement judges look for, satisfied without extra ceremony.

---

## 📁 Repository Structure

```
signal-atlas/
├── README.md
├── EXECUTION.md                # the operational build plan, in full
├── docs/
│   ├── API_CONTRACT.md         # frontend-facing contract
│   ├── COPILOT_BRIEF.md        # standalone spec handed to the Copilot's author
│   ├── DEMO_SCRIPT.md          # the reproducible 8-step healing walkthrough
│   └── adr/                    # 4 architecture decision records
├── collectors/
│   ├── registry.yaml           # key → real c_* collector_id, urls, prompt, required fields
│   └── prompts/*.txt           # the exact, under-500-char creation prompts, verbatim
├── fixtures/                   # served via GitHub Pages — publicly reachable, not localhost
│   ├── newsroom_v1.html
│   └── newsroom_v2_mutated.html
├── examples/sample_signals.json
├── seed/signals_seed.json
├── app/
│   ├── domain/                 # PURE — zero I/O, 100% unit-tested
│   │   ├── models.py  enums.py  normalizer.py  validator.py
│   │   └── dedup.py  convergence.py  geo.py
│   ├── infra/
│   │   ├── cli/                # protocol.py, bdata.py (real), fake.py (offline testing), parsers.py
│   │   └── db/                 # models, session, repositories
│   ├── services/                # ingest, healing, zones, jobs, adhoc, copilot, jobs runner
│   ├── schemas/                 # DTOs only, no logic
│   └── api/routes/              # thin handlers, under 15 lines, delegate to services
└── tests/
    ├── unit/domain/              # fast, pure, the bulk of the suite
    ├── integration/api/          # ASGI + in-memory sqlite + FakeCli — no network, no API key
    └── fixtures/cli/              # recorded CLI response envelopes
```

---

## 🧱 Engineering Principles We Refused to Break

These are checkable by a judge in five minutes, not just claimed in prose:

1. **`domain/` performs zero I/O.** No DB session, no HTTP client, no subprocess, no unlogged wall-clock reads — even the current time is injected, not called implicitly. This is enforced by `import-linter`, and CI fails the build if it's violated.
2. **The CLI sits behind a `Protocol`.** `BdataCli` talks to the real binary; `FakeCli` replays recorded response envelopes. The **entire test suite runs with no Bright Data API key and no network** — 391 tests, offline, in seconds.
3. **Subprocess calls use `create_subprocess_exec` with an argv list — never `shell=True`, never an f-string command.** A dedicated regression test asserts `create_subprocess_shell` appears nowhere in the codebase. Client-supplied text can influence a *heal prompt*, but never a URL or a shell token — URLs are only ever resolved server-side from the committed registry.
4. **No business logic in route handlers.** If a handler exceeds ~15 lines, the logic belongs in a service, not the route.
5. **One source of truth per rule.** The Copilot's tools call the same repositories and services the REST API calls — it cannot compute a number the map doesn't already agree with.
6. **No auto-heal.** A deliberate product decision (ADR 0004), not a missing feature — a human approves every repair before it goes live.

---

## 🚀 Running It Yourself

```bash
# CLI setup
npm install -g @brightdata/cli
brightdata login --api-key <your key>

# Backend
py -3.12 -m venv .venv && source .venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env   # fill in ADMIN_API_KEY, ANTHROPIC_API_KEY, FIXTURE_BASE_URL

python -m app.seed
uvicorn app.main:app --reload
```

```bash
curl http://localhost:8000/api/health
curl "http://localhost:8000/api/zones?city=Delhi"
```

Provisioning the live collector fleet against Bright Data (batched to respect the 3-concurrent-job AI-Flow cap):

```bash
bash scripts/provision_collectors.sh
```

---

## 🧪 Reproducing the Self-Healing Demo

Because Bright Data's crawlers run in the cloud, the demo fixtures are hosted publicly rather than on `localhost` — anyone, including a judge with no local setup, can run this exact sequence:

```bash
brightdata scraper run <demo_collector_id> "https://<user>.github.io/signal-atlas/fixtures/newsroom_v1.html" --json
# → HEALTHY, full fields populated

brightdata scraper run <demo_collector_id> "https://<user>.github.io/signal-atlas/fixtures/newsroom_v2_mutated.html" --json
# → title/city null — layout changed

brightdata scraper heal <demo_collector_id> "Titles moved from article.news-card h2 to div.press-wrapper h3; date now inside span.release-date"
# → status: awaiting_approval, with a diff preview

brightdata scraper approve <demo_collector_id>
# → status: done

brightdata scraper run <demo_collector_id> "https://<user>.github.io/signal-atlas/fixtures/newsroom_v2_mutated.html" --json
# → HEALTHY again, same collector_id, zero application code changed
```

---

## 📋 Honesty Section: What's Verified vs. What's Not

We'd rather a judge trust every line of this README than be impressed by one they later have to discount.

**Permanent Project Record:**
- **Arjit Ujjawal** (@arjitujjawal-art) - Core Backend Engineering & CLI Orchestration
- **Teammate 1** (@username1) - Frontend Spatial Views & Animation
* **Teammate 2** (@username2) - Conversational Copilot & OpenAI Integrations

**Verified and working today:**
- Full backend: domain, infra, services, API — 391 tests passing, mypy strict across 54 modules, ruff clean, all 3 import-linter contracts held.
- Real, checked source targets: IIT Delhi research + startup pages, UC Berkeley research, Eventbrite Delhi/NCR and Bay Area — all fetched and confirmed to load publicly, without login, during planning.
- The 500-character prompt cap on `scraper create` was hit for real during provisioning, root-caused, fixed, and is now guarded by a regression test that fails if any prompt regrows past the limit.
- The corrected source-concentration cap math, proven by a property-based test over randomized inputs.

**Known, stated limitations — not hidden:**
- **Asymmetric source coverage.** `startup_newsroom` cleared our verification bar (≥10 dated items, loads without login, locality-bearing) for San Francisco (`sfstandard.com`) but not for Delhi — five candidates were checked (TechCrunch's feed is global with no per-item city; YourStory 403'd a plain fetch; two India-focused outlets never printed a locality at all). Rather than force a weak collector into the Delhi fleet, Delhi ships with three source types to SF's four, and this is stated plainly rather than glossed over — cross-city score comparisons are not perfectly like-for-like as a result.
- **Manual healing, not automatic.** By design — see ADR 0004.
- **In-process job runner.** Background jobs (for async CLI operations) do not persist across a server restart; this is an accepted MVP tradeoff, not an oversight.
- **Single shared admin key** gates write operations for the hackathon build, rather than per-user auth.

---

## ✅ Judging Criteria, Mapped Directly

| Criterion | Where to look |
|---|---|
| **Potential Impact** | Predictive, not reactive: signals precede formal job listings by weeks — see [Why This Exists](#-why-this-exists) |
| **Creativity & Innovation** | Convergence scoring over raw listings; ad-hoc paste-a-URL scraping folded into the same pipeline as the standing fleet |
| **Technical Excellence** | Pure domain core, `import-linter`-enforced layering, `Protocol`-backed CLI with offline `FakeCli` testing, 391 tests, corrected math with property-based proofs |
| **Use of Scraper Studio** | Four distinct integration points: standing fleet, self-healing, ad-hoc creation, GitHub-Pages-hosted reproducible demo — every collector ID in `registry.yaml` is real and checkable |
| **Reliability & Self-Healing** | The full 8-step degrade → heal → approve → recover loop, gated by human approval, reproducible by anyone with the repo |
| **Presentation Clarity** | This document, the honesty section above, and a demo script that a judge can run themselves without our machine |