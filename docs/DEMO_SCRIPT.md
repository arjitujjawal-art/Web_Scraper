# Signal Atlas — self-healing demo

The claim: **a source page changes its HTML, the collector breaks, and it is repaired
without a line of application code changing.** This document is the exact sequence to
prove it, reproducible by someone who has never seen the repository.

Five API calls. One collector. Two URLs.

```
HEALTHY ──(the page changes)──▶ DEGRADED ──POST /heal──▶ HEALING_REVIEW
        ──POST /approve──▶ HEALED ──POST /run──▶ HEALTHY
```

The same sequence exists in three places, deliberately: here, in
`tests/integration/api/test_healing_cycle.py`,
and in `FakeCli.script_healing_demo()`. If one drifts, the test suite fails.

## Why fixtures and not a live site

Mutating a real newsroom's HTML is not available to us, and waiting for one to redesign is
not a demo. So the break is staged: two files that differ **only** in their selectors.

| | `newsroom_v1.html` | `newsroom_v2_mutated.html` |
|---|---|---|
| Release card | `article.news-card` | `div.press-wrapper` |
| Title | `h2.news-card__title` | `h3.press-wrapper__heading` |
| Date | `time.news-card__date[datetime]` | `span.release-date`, shorter format |
| City | `p.news-card__location` | unlabelled `span` in `div.press-meta` |
| Domain | `p.news-card__domain` | unlabelled `span` in `div.press-meta` |

Six releases, **identical wording and order** in both files. Nothing about the information
changed; only the markup did. That is what makes the fill-rate drop attributable to the
layout and nothing else.

They are served from **GitHub Pages**, not `localhost`. Collectors execute on Bright Data
infrastructure and cannot reach your laptop — a fixture on `http://localhost:8000` returns
nothing, which looks exactly like a broken collector and wastes twenty minutes of anyone's
debugging. Public hosting also means a judge can open both files and diff them.

## Before you start

```bash
brightdata --version          # >= 0.3.2
```

`collectors/registry.yaml` must have a real `c_*` id for `demo_newsroom` — not `PENDING`.
While it is `PENDING`, every operation below answers `409 collector_not_provisioned` by
design, rather than failing inside the CLI with something obscure.

```bash
.venv/Scripts/python.exe -m app.seed
py -3.12 -m uvicorn app.main:create_app --factory --reload
```

Two terminals: one for the server, one for `curl`. Have the map open on a third screen if
there is one — the point of steps 1 and 5 is that the map moves.

```bash
export ADMIN_KEY="…the value from your .env…"
export BASE=http://localhost:8000
export FIXTURES=https://arjitujjawal-art.github.io/signal-atlas/fixtures
```

Every `POST` below returns `202` immediately with a `poll_url`. Poll it until `status` is
`SUCCEEDED` or `FAILED`; a real `heal` can take minutes. This helper does it:

```bash
dispatch() { # dispatch <path> [json-body]
  run_id=$(curl -sS -X POST "$BASE$1" -H "X-Admin-Key: $ADMIN_KEY" \
    -H 'Content-Type: application/json' ${2:+-d "$2"} | jq -r .run_id)
  until [ "$(curl -sS "$BASE/api/collector-runs/$run_id" | jq -r .status)" != QUEUED ] \
     && [ "$(curl -sS "$BASE/api/collector-runs/$run_id" | jq -r .status)" != RUNNING ]; do
    sleep 2
  done
  curl -sS "$BASE/api/collector-runs/$run_id" | jq .
}
```

## Step 1 — a healthy baseline

```bash
dispatch /api/collectors/demo_newsroom/run
```

```json
{ "status": "SUCCEEDED", "health": "HEALTHY", "records_found": 6, "records_stored": 6,
  "fill_rate": 1.0, "missing_fields": [], "rejected_records": 0, "notes": null }
```

Six releases in, six signals stored, every required field present. Check the map:

```bash
curl -sS "$BASE/api/zones" | jq '.items[] | {zone_id, score, confidence}'
```

Six zones appear across Delhi and San Francisco. **Say:** *"This is a working collector. Now
the source is going to redesign its page."*

## Step 2 — the page changes underneath it

Same collector, same `c_*` id, second registered URL:

```bash
dispatch /api/collectors/demo_newsroom/run "{\"url\": \"$FIXTURES/newsroom_v2_mutated.html\"}"
```

```json
{ "status": "SUCCEEDED", "health": "DEGRADED", "records_found": 6, "records_stored": 0,
  "fill_rate": 0.5, "missing_fields": ["title", "city"], "rejected_records": 6,
  "rejection_reasons": ["missing or too-short title"],
  "notes": "fill rate 50%; missing in every record: title, city; 6 record(s) failed normalization" }
```

Three things to point at, in this order:

1. **`status: SUCCEEDED`, `health: DEGRADED`.** The job ran perfectly. The *page* broke.
   Those are different questions and the API answers them separately.
2. **`fill_rate: 0.5`** — measured on the **raw** rows, before normalization. Normalize
   first and a page whose titles vanished just yields fewer signals: a quiet under-report
   instead of an event anyone can be shown. This number is why the break is visible at all.
3. **`records_stored: 0`, six rejected.** A half-empty signal is worse than no signal, so
   nothing is stored on a guess.

```bash
curl -sS "$BASE/api/collectors" | jq '.needs_attention'          # 1
curl -sS "$BASE/api/signals?limit=1" | jq '.meta.total'          # still 6
```

The dashboard turns red, and **the map does not go blank**. Signals are upserted, never
replaced wholesale — one collector breaking must not look like the opportunity zones
ceasing to exist.

## Step 3 — ask for a repair, in English

```bash
dispatch /api/collectors/demo_newsroom/heal '{"prompt": "Article titles moved from article.news-card h2 to div.press-wrapper h3.press-wrapper__heading, and the city now appears in span.release-city."}'
```

No selectors are written by us. No code is edited. A sentence describing what moved goes to
Scraper Studio, capped at 1000 characters because the CLI caps it there.

```json
{ "status": "SUCCEEDED", "health": "HEALING_REVIEW", "cli_status": "awaiting_approval",
  "diff_summary": "title: article.news-card h2.news-card__title -> div.press-wrapper h3.press-wrapper__heading; date: time.news-card__date[datetime] -> span.release-date; …",
  "next_step": "Run `brightdata scraper approve c_… ` to apply these changes, or `--reject` to discard them.",
  "preview_rows": [ /* 3 rows the repaired selectors would extract */ ] }
```

**Nothing has been applied yet.** This is the part worth slowing down on:

```bash
curl -sS "$BASE/api/collectors/demo_newsroom" | jq '{health, awaiting_approval, needs_attention}'
```

```json
{ "health": "HEALING_REVIEW", "awaiting_approval": true, "needs_attention": true }
```

`diff_summary` plus `preview_rows` **is** the review screen — the proposed selector change
and the rows it would produce, stored on the run row rather than only logged, so it is
reviewable minutes later and after a page refresh.

**Say:** *"An AI proposed a repair to production extraction logic. A human is about to read
it before it applies."*

## Step 4 — a human approves it

```bash
dispatch /api/collectors/demo_newsroom/approve
```

```json
{ "status": "SUCCEEDED", "health": "HEALED", "cli_status": "done", "action": "approve",
  "error": null }
```

A **separate, deliberate** CLI invocation. `--auto-approve` exists in the Bright Data CLI
and this backend never passes it — asserted by a test that scans every argv the application
can build, plus a source scan over all of `app/`. The gap between step 3 and step 4 is not
an inconvenience we failed to automate; it is the product.

Try it twice:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' -X POST \
  "$BASE/api/collectors/demo_newsroom/approve" -H "X-Admin-Key: $ADMIN_KEY"   # 409
```

`409 nothing_to_approve`. The pending repair is stamped when applied, so a second click
cannot queue an approve for a repair that no longer exists.

## Step 5 — the same page parses again

```bash
dispatch /api/collectors/demo_newsroom/run "{\"url\": \"$FIXTURES/newsroom_v2_mutated.html\"}"
```

```json
{ "status": "SUCCEEDED", "health": "HEALTHY", "fill_rate": 1.0, "records_stored": 6,
  "missing_fields": [], "target_url": "…/newsroom_v2_mutated.html" }
```

The **mutated** URL. The **same** `c_*` collector id. **Zero** lines of this repository
changed between step 2 and step 5. The fix happened in Scraper Studio.

```bash
curl -sS "$BASE/api/collectors" | jq '.needs_attention'      # 0
curl -sS "$BASE/api/signals?limit=1" | jq '.meta.total'      # 6, not 12
curl -sS "$BASE/api/zones" | jq '.items | length'            # 6
```

Six, not twelve: signal ids are derived from source URL and title, so a re-run of the same
page is an update. The dashboard goes green and the map is whole.

## The audit trail

One request that tells the entire story after the demo:

```bash
curl -sS "$BASE/api/collector-runs" | jq '.items[] | {action, status, health, fill_rate}'
```

```
run      SUCCEEDED  HEALTHY   1.0     ← step 5, the mutated page, repaired
approve  SUCCEEDED  HEALED    0.0     ← step 4
heal     SUCCEEDED  HEALED    0.0     ← step 3, re-stamped when its repair was applied
run      SUCCEEDED  DEGRADED  0.5     ← step 2, the break
run      SUCCEEDED  HEALTHY   1.0     ← step 1, the baseline
```

Newest first. Five rows, every one `SUCCEEDED`, and the health column is the whole arc. The
heal row is re-stamped `HEALED` on approval on purpose: it is the row the dashboard reads to
decide whether a repair is pending, so leaving it `HEALING_REVIEW` would advertise a repair
that has already been applied.

## Rehearsing without a key, a network, or a collector

The entire cycle runs offline against recorded CLI envelopes:

```bash
.venv/Scripts/python.exe -m pytest tests/integration/api/test_healing_cycle.py -v
```

Every step above is one test name. `FakeCli` replays
`tests/fixtures/cli/{run_healthy,run_degraded,heal_awaiting_approval,approve_done}.json`
through the real routes, real services and real normalizer — only the subprocess boundary is
substituted. This is also the fallback if the venue's network fails mid-demo: the recorded
envelopes are real CLI output, and running the suite shows the same five transitions.

## Timing and failure notes

| | |
|---|---|
| Steps 1, 2, 5 (`run`) | seconds on a fixture; CLI default 600 s single-URL |
| Step 3 (`heal`) | **minutes.** CLI default 600 s. Our timeout is 660 s |
| Step 4 (`approve`) | usually fast, same 660 s ceiling |
| AI-Flow concurrency | 3 jobs per account; this backend serialises to 1 for a deterministic demo |

If a CLI call times out or the binary is missing, the `POST` still returns `202` and the
**run row** ends `FAILED` with the reason in `error`. Show it: a system that reports its own
breakage is the thing being demonstrated. `GET /api/health` carries `active_jobs` if you
need to prove nothing is stuck.

