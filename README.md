<div align="center">

```
                          ┌──────────────────────────────────────────────────────┐
                          │                                                      │
                          │    ███████╗██╗ ██████╗ ███╗   ██╗ █████╗ ██╗         │
                          │    ██╔════╝██║██╔════╝ ████╗  ██║██╔══██╗██║         │
                          │    ███████╗██║██║  ███╗██╔██╗ ██║███████║██║         │
                          │    ╚════██║██║██║   ██║██║╚██╗██║██╔══██║██║         │
                          │    ███████║██║╚██████╔╝██║ ╚████║██║  ██║███████╗    │
                          │    ╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝    │
                          │                                                      │
                          │     █████╗ ████████╗██╗      █████╗ ███████╗         │
                          │    ██╔══██╗╚══██╔══╝██║     ██╔══██╗██╔════╝         │
                          │    ███████║   ██║   ██║     ███████║███████╗         │
                          │    ██╔══██║   ██║   ██║     ██╔══██║╚════██║         │
                          │    ██║  ██║   ██║   ███████╗██║  ██║███████║         │
                          │    ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚══════╝         │
                          │                                                      │
                          └──────────────────────────────────────────────────────┘
```

### We don't scrape opportunities. We scrape the signals that reveal where opportunities are about to emerge.
📣 **Deployed link :** [click on this](https://web-scraper-day.pages.dev)


*A self-healing, predictive signal-convergence engine built on Bright Data Scraper Studio.*
*Built for **Into the Scrape-Verse** — WeMakeDevs × Bright Data*

[![Tests](https://img.shields.io/badge/tests-391%20passing-2ea44f?style=for-the-badge)]()
[![mypy](https://img.shields.io/badge/mypy-strict%20%7C%2054%20modules-3178C6?style=for-the-badge)]()
[![ruff](https://img.shields.io/badge/ruff-clean-000000?style=for-the-badge)]()
[![import--linter](https://img.shields.io/badge/architecture-3%20contracts%20kept-A855F7?style=for-the-badge)]()
[![Bright Data](https://img.shields.io/badge/Bright%20Data-Scraper%20Studio-1D4ED8?style=for-the-badge)]()
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)]()

</div>

<br>

<div align="center">

| 🧠 Domain Core | 🔁 Self-Healing | 🧪 Test Suite | 🏙️ Coverage | 🤖 Copilot Tools | 🔓 Zero-Key Testing |
|:---:|:---:|:---:|:---:|:---:|:---:|
| Zero I/O, pure functions | `create → run → heal → approve` | **391 passing** | Delhi + SF | **5** DB-grounded tools | Full suite runs offline |

</div>

---

## Table of Contents

1. [Why This Exists](#-why-this-exists)
2. [What It Actually Does (and Doesn't)](#-what-it-actually-does-and-doesnt)
3. [System Architecture](#️-system-architecture)
4. [The Journey of a Single Signal](#-the-journey-of-a-single-signal)
5. [Self-Healing: The Full Sequence](#-self-healing-the-full-sequence)
6. [Collector Lifecycle](#-collector-lifecycle)
7. [The Ad-Hoc Router](#-the-ad-hoc-router-paste-any-url)
8. [The Math](#-the-math)
9. [Signal Copilot](#-signal-copilot)
10. [API Reference](#-api-reference)
11. [Repository Structure](#-repository-structure)
12. [Engineering Principles We Refused to Break](#-engineering-principles-we-refused-to-break)
13. [Running It Yourself](#-running-it-yourself)
14. [Reproducing the Self-Healing Demo](#-reproducing-the-self-healing-demo)

---

## 🎯 Why This Exists

Every job board, every market-intel dashboard, every "opportunity tracker" on the internet does the same thing: it shows you what's **already been posted**. By the time a role is listed, or a tender is public, the interesting part — the *decision* to expand, to hire, to fund, to build — already happened weeks earlier, in a press release nobody indexed, a university lab bulletin nobody read, a tech-meetup calendar nobody cross-referenced against the startup newsroom next door.

```mermaid
quadrantChart
    title Reactive Aggregators vs. Signal Atlas
    x-axis "Data is Old" --> "Data is Fresh"
    y-axis "Passive Listing" --> "Predictive Signal"
    quadrant-1 "Signal Atlas"
    quadrant-2 "Real-time job alerts"
    quadrant-3 "Static directories"
    quadrant-4 "Classic job boards"
    "LinkedIn / Indeed feeds": [0.55, 0.25]
    "Static company directories": [0.15, 0.15]
    "Real-time alert bots": [0.75, 0.35]
    "Signal Atlas": [0.6, 0.92]
```

**Signal Atlas** watches early signals instead — university research announcements, incubator portfolio news, and public tech events — across two live target ecosystems, **Delhi/NCR** and **San Francisco/Bay Area**. It normalizes everything into one schema and looks for **convergence**: multiple independent sources pointing at the same city and the same technical domain within the same window. When that convergence crosses a threshold, it's a computed, decayed, source-capped score — not a guess.

And because the web that feeds this pipeline changes its layout constantly, the whole thing is wired end-to-end to **Bright Data Scraper Studio's** self-healing loop: `create → run → heal → approve`, no redeploy, same collector ID, zero application code touched.

---

## 🔍 What It Actually Does (and Doesn't)


| ✅ It does | 🚫 It does not |
|---|---|
| Computes a defensible, source-capped, time-decayed **Emergence Score** per `(city, domain)` | Invent a score when there's no data — unknown cities get an honest "not monitored" answer |
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

    subgraph Sources ["🌐 PUBLIC SOURCES · Delhi and SF"]
        A["University Research<br/>IIT Delhi · UC Berkeley"]
        B["Incubator News<br/>IIT Delhi Startups · Y Combinator"]
        C["Tech Events<br/>Eventbrite Delhi/NCR & Bay Area"]
        D["Startup Newsroom<br/>SF Standard verified"]
    end

    A & B & C & D -->|"brightdata scraper run collector_id url"| E["⚙️ Async CLI Bridge<br/>argv exec, never shell=True"]

    subgraph Gate ["🛡️ VALIDATION AND SELF-HEALING GATE"]
        E --> F["Payload Validator<br/>pure domain"]
        F --> G{"Fill Rate ≥ 80%?"}
        G -->|Yes| H[("📦 Signal Repository")]
        G -->|No| I["🔴 DEGRADED"]:::alert
        I --> J["brightdata scraper heal"]:::gate
        J --> K["🟡 awaiting_approval<br/>+ diff preview"]:::gate
        K --> L["brightdata scraper approve"]:::gate
        L -->|same collector_id| E
    end

    subgraph Domain ["🧠 PURE DOMAIN CORE — zero I/O"]
        H --> M["Dedup<br/>merge, don't discard"]:::pure
        M --> N["Convergence Engine<br/>decay + source-cap invariant"]:::pure
        N --> O["Geo Resolver<br/>static locality registry"]:::pure
    end

    subgraph Surface ["🖥️ PRESENTATION"]
        O --> P["REST API :8000"]
        P --> Q["🗺️ Spatial Map"]:::pure
        P --> R["🤖 Signal Copilot<br/>5 tools, DB-grounded"]:::pure
    end

    subgraph AdHoc ["🔗 ON-DEMAND PATH"]
        S["User pastes any URL"] --> T{"Domain already<br/>registered?"}
        T -->|Fast path| E
        T -->|Slow path| U["brightdata scraper create<br/>under 500 chars"]
        U --> E
    end
```

**Layer discipline, enforced by tooling, not trust:**

```
┌─────────┐     ┌────────────┐     ┌───────────┐     ┌──────────┐
│   api   │ ──▶ │  services  │ ──▶ │   infra   │ ──▶ │  domain  │
└─────────┘     └────────────┘     └───────────┘     └──────────┘
                                                            ▲
                                            no arrow points back in ─┘
```

`domain/` cannot import `infra`, `api`, or `services` — this is a CI-checked contract, not a style guideline. If a pull request violates it, the build fails before a human has to notice.

---

## 🌊 The Journey of a Single Signal

What actually happens, end to end, the moment one real-world press release becomes a pixel on the map:

```mermaid
sequenceDiagram
    autonumber
    participant Web as 🌐 Public Site
    participant CLI as ⚙️ Scraper Studio
    participant Val as 🛡️ Validator
    participant Dom as 🧠 Domain Core
    participant DB as 📦 signals.db
    participant Map as 🗺️ Map / Copilot

    Web->>CLI: brightdata scraper run <collector_id> <url>
    CLI-->>Val: raw JSON array
    Val->>Val: compute Field Fill Rate
    alt fill rate ≥ 80%
        Val->>Dom: NormalizedSignal
        Dom->>Dom: dedup (merge evidence, don't discard)
        Dom->>Dom: emergence score + source cap
        Dom->>DB: persist zone + signal
        DB->>Map: GET /api/zones → pulsing marker
    else fill rate < 80%
        Val->>Map: mark collector DEGRADED 🔴
        Note over Map: waits for a human to trigger healing
    end
```

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

Bright Data returns a server-generated ID (`c_*`) — never chosen by us — recorded in a committed `collectors/registry.yaml`. Every ID in the repo is direct, checkable evidence that the collector actually exists.

### 2. Self-Healing on the Standing Fleet
See the [full sequence](#-self-healing-the-full-sequence) below — the centerpiece of the "reliability" criterion.

### 3. Ad-Hoc / One-Stop Scraping — "paste any URL"
Covered visually in [The Ad-Hoc Router](#-the-ad-hoc-router-paste-any-url).

### 4. Active Jobs — a separate, honest layer
Traditional job vacancies are real and useful, but they are **lagging indicators** — the opposite of what emergence scoring measures. Rather than blend them in and quietly corrupt the math, they live in their own `job_postings` table, served by `GET /api/jobs`, and rendered as a **separate map layer** the user toggles on.

---

## 🔁 Self-Healing: The Full Sequence

The CLI's real behavior — not the version every early spec draft got wrong:

| ❌ Assumption in early drafts | ✅ Verified reality |
|---|---|
| `--name` selects a collector to run | `--name` is a job label on `run`, a template name on `create` — never a selector |
| Collector ID is something we choose (`c_startup_news`) | ID is **server-generated** (`c_mp3tuab31lswoxvpws`), captured from the `create` response |
| `heal`/`approve` complete in ~30 seconds | Up to **600 seconds**; `create` up to **25 minutes** → forces an **async job model** (`202` + polling) |
| Test fixtures can live on `localhost` | Bright Data's crawlers run in the **cloud** — fixtures are hosted on **GitHub Pages** instead, publicly reproducible |

```mermaid
sequenceDiagram
    autonumber
    actor Judge as  You 
    participant API as  Signal Atlas API
    participant CLI as  Bright Data CLI
    participant SS as  Scraper Studio

    Judge->>CLI: run demo_collector → newsroom_v1.html
    CLI->>SS: fetch + extract
    SS-->>CLI: title, date, city ✅ all present
    CLI-->>Judge: 🟢 HEALTHY (fill rate 1.0)

    Judge->>CLI: run demo_collector → newsroom_v2_mutated.html
    CLI->>SS: fetch + extract (selectors now stale)
    SS-->>CLI: title: null, city: null
    CLI-->>Judge: 🔴 DEGRADED (fill rate < 0.8)

    Judge->>API: POST /heal "titles moved to div.press-wrapper h3..."
    API->>CLI: brightdata scraper heal <id> "<feedback>"
    CLI->>SS: re-analyze DOM tree
    SS-->>CLI: proposed new selectors
    CLI-->>API: 🟡 awaiting_approval + diff_summary
    API-->>Judge: preview the repaired output

    Judge->>API: POST /approve
    API->>CLI: brightdata scraper approve <id>
    CLI->>SS: promote fix to production
    SS-->>CLI: status: done

    Judge->>CLI: run demo_collector → newsroom_v2_mutated.html (again)
    CLI->>SS: fetch + extract (new selectors)
    SS-->>CLI: title, date, city ✅ all restored
    CLI-->>Judge: 🟢 HEALTHY — same collector_id, zero app code changed
```

Healing is **manual, not automatic**, by deliberate design (`ADR 0004`): the pipeline flags `DEGRADED` and waits for a human to trigger the repair. That keeps the failure visible instead of silently patching over it before anyone can watch it happen — which is the entire point of a *demo*.

---

## 🩺 Collector Lifecycle

Every collector in the fleet is always in exactly one of these states — this is what the Pipeline Health dashboard renders directly:

```mermaid
stateDiagram-v2
    [*] --> HEALTHY
    HEALTHY --> DEGRADED: fill rate drops below 80%
    DEGRADED --> HEALING_REVIEW: brightdata scraper heal
    HEALING_REVIEW --> HEALED: brightdata scraper approve
    HEALING_REVIEW --> DEGRADED: rejected, try again
    HEALED --> HEALTHY: next successful run
    DEGRADED --> FAILED: CLI error / timeout
    FAILED --> HEALING_REVIEW: retry heal
    HEALTHY --> [*]

    note right of DEGRADED
        Flagged, not fixed.
        A human decides what happens next.
    end note
```

---

## 🔗 The Ad-Hoc Router: "Paste Any URL"

The one-stop scraper feature — a user or the Copilot hands over any public URL, and the backend decides in milliseconds whether it already knows this domain or needs to build a brand-new collector on the spot.

```mermaid
flowchart LR
    Start(["📋 User pastes a URL<br/>+ what they want extracted"]) --> Check{"Does the domain<br/>match registry.yaml?"}

    Check -->|"Yes — known domain"| Fast["⚡ FAST PATH<br/>brightdata scraper run<br/>&lt;existing_collector_id&gt; &lt;url&gt;"]
    Check -->|"No — never seen"| Slow["🐢 SLOW PATH<br/>brightdata scraper create<br/>&lt;url&gt; &quot;&lt;prompt ≤500 chars&gt;&quot;"]

    Fast --> Run["Run against the new URL"]
    Slow --> NewID["Capture new server-generated c_* id"] --> Run

    Run --> Validate["🛡️ Same PayloadValidator<br/>as the standing fleet"]
    Validate --> Dedup["Same dedup + convergence engine"]
    Dedup --> Live["🗺️ Signal appears on the live map<br/>within the same request-response cycle"]

    style Fast fill:#064E3B,stroke:#059669,color:#34D399
    style Slow fill:#312E81,stroke:#6366F1,color:#A5B4FC
    style Live fill:#1E3A5F,stroke:#3B82F6,color:#93C5FD
```

One pipeline, not a special case — whatever path a signal takes to get in, it's judged by the exact same fill-rate, dedup, and scoring rules as everything in the standing fleet.

---

## 📐 The Math

Signals are grouped by `(city, domain)` and decayed over time:

$$S_{emergence}(city, domain) = \sum_{i=1}^{N} w(type_i) \cdot e^{-\lambda \cdot t_i}$$

| Symbol | Meaning |
|---|---|
| $w(type_i)$ | `3.0` facility/lab expansion · `2.0` research grant/partnership · `1.0` meetup/tech event |
| $t_i$ | age of the signal in days |
| $\lambda$ | `0.1` — roughly a 30-day effective window |

```mermaid
xychart-beta
    title "Signal Weight Decay Over Time (λ = 0.1)"
    x-axis "Days Since Signal" [0, 5, 10, 15, 20, 25, 30, 40, 50]
    y-axis "Remaining Weight Multiplier" 0 --> 1
    line [1.0, 0.61, 0.37, 0.22, 0.14, 0.08, 0.05, 0.02, 0.007]
```

**The source-concentration cap — corrected.** The naive rule ("no source type may exceed 60% of the score") is easy to implement wrong. Clipping the dominant contributor to `total × 0.6` doesn't enforce a 60% *share*: with contributions A=80, B=20, that clip yields 80 — where A is now **75%** of the total. The invariant that actually holds:

$$\text{Final} = \min\left(\text{Total},\ \frac{\text{Other Sources}}{1 - 0.6}\right)$$

With A=80, B=20 this correctly yields **50**, where A's share is exactly 60% — proven by a property-based test over randomized inputs, not just claimed in a comment.

**Deduplication merges, it doesn't discard.** Three outlets reporting the same facility opening within a 3-day window (`SequenceMatcher` similarity > 0.85) are counted once — but all three source URLs are retained as evidence, so the "why is this flagged" panel can say *"three independent outlets reported this."*

**Confidence** ships with every score: `HIGH` (≥3 distinct source types) · `MEDIUM` (2) · `LOW` (1) — so the map visually distinguishes real convergence from one chatty feed.

---

## 🤖 Signal Copilot

A conversational layer that answers in natural language but **contains no SQL and no scoring arithmetic of its own** — it calls the exact same services the REST API calls, so a chat answer can never disagree with what the map shows.

```mermaid
flowchart TD
    U["🗣️ 'Why is Delhi flagged for AI/ML?'"] --> LLM["Claude — tool-use loop"]
    LLM -->|search_signals| S1[("signals table")]
    LLM -->|get_emergence_score| S2[("Convergence Engine")]
    LLM -->|search_active_jobs| S3[("job_postings table")]
    LLM -->|scrape_custom_url| S4["Ad-Hoc Router"]
    LLM -->|get_scraper_fleet_health| S5[("collector_runs table")]
    S1 & S2 & S3 & S4 & S5 --> Ground["Grounded answer<br/>cited by signal_id"]
    Ground --> Out["💬 Reply the map already agrees with"]

    style LLM fill:#312E81,stroke:#6366F1,color:#A5B4FC
    style Ground fill:#064E3B,stroke:#059669,color:#34D399
```

| Tool | What it queries | Answers questions like |
|---|---|---|
| `search_signals` | Predictive early signals (labs, grants, events) | *"What's driving activity in Delhi's AI/ML scene?"* |
| `get_emergence_score` | Live, decayed, source-capped score | *"Why is San Francisco flagged for Robotics — show the math"* |
| `search_active_jobs` | The separate `job_postings` table | *"Any open roles in Noida right now?"* |
| `scrape_custom_url` | Ad-hoc fast/slow-path scraper, live, mid-conversation | *"Scrape this article and tell me what it means for Delhi"* |
| `get_scraper_fleet_health` | Real-time collector fill rates and health states | *"Is anything broken right now?"* |

**A guardrail against a real failure mode.** An early draft answered *every* question with a fixed city and a hardcoded score of `8.42`, regardless of what was asked. The current implementation validates the requested city against what's actually in the database — an unrecognized city gets an honest *"Signal Atlas doesn't monitor that city,"* never a silently substituted answer. Every claim is grounded in a tool result and cited by `signal_id`.

**Cache-first, actively-crawling.** Ask about jobs in a locality, and the Copilot returns whatever's already in the database instantly, while a live Bright Data crawl runs in the background to pull anything new.

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

Every JSON response follows one normalized schema, and a populated example lives at `/examples/sample_signals.json`.

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

1. **`domain/` performs zero I/O.** No DB session, no HTTP client, no subprocess, no unlogged wall-clock reads. Enforced by `import-linter`; CI fails the build if violated.
2. **The CLI sits behind a `Protocol`.** `BdataCli` talks to the real binary; `FakeCli` replays recorded response envelopes. The **entire test suite runs with no Bright Data API key and no network** — 391 tests, offline, in seconds.
3. **Subprocess calls use `create_subprocess_exec` with an argv list — never `shell=True`.** A dedicated regression test asserts `create_subprocess_shell` appears nowhere in the codebase.
4. **No business logic in route handlers.** If a handler exceeds ~15 lines, the logic belongs in a service.
5. **One source of truth per rule.** The Copilot's tools call the same repositories and services the REST API calls.
6. **No auto-heal.** A deliberate product decision (`ADR 0004`) — a human approves every repair before it goes live.

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

Provisioning the live collector fleet (batched to respect the 3-concurrent-job AI-Flow cap):

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

## Verified and working today:

- Full backend: domain, infra, services, API — 391 tests passing, mypy strict across 54 modules, ruff clean, all 3 import-linter contracts held.
- Real, checked source targets: IIT Delhi research + startup pages, UC Berkeley research, Eventbrite Delhi/NCR and Bay Area — all fetched and confirmed to load publicly, without login, during planning.
- The 500-character prompt cap on `scraper create` was hit for real during provisioning, root-caused, fixed, and is now guarded by a regression test.
- The corrected source-concentration cap math, proven by a property-based test over randomized inputs.


---



```mermaid
mindmap
  root((Signal Atlas))
    Impact
      Predictive not reactive
      Weeks ahead of job listings
    Innovation
      Convergence scoring
      Paste-any-URL ad-hoc pipeline
    Technical Excellence
      Pure domain core
      import-linter enforced layers
      391 tests, zero-key offline suite
    Scraper Studio
      Standing fleet
      Self-healing loop
      Ad-hoc creation
      GitHub Pages demo
    Reliability
      8-step degrade → heal → recover
      Human-gated approval
    Presentation
      This README
      Honesty section
      Judge-reproducible demo
```
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
   
---


## 👥 Team & Links

**Built by:**

| Name | Role |
|---|---|
| Arjit Ujjwal | Backend architecture, Bright Data Scraper Studio integration, self-healing pipeline |
| Ganesh Nair | Frontend — spatial map, dashboards, UI |
| Jayvee Shah | Backend architecture, Bright Data Scraper Studio integration, self-healing pipeline |
| Sumedh Kulkarni | Frontend — spatial map, dashboards, UI |


📣 **Read our hackathon journey:** [LinkedIn post](https://lnkd.in/p/dceu4rDr)

📣 **Demonstrating the project:** [Youtube Video](https://youtu.be/Jj4-bI_ZxC8)



<div align="center">

---

**Signal Atlas** — *mapping tomorrow's ecosystems from today's quiet signals.*

</div>
