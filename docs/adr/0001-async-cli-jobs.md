# ADR 0001 — CLI operations are async jobs, not synchronous requests

- **Status:** accepted
- **Date:** 2026-08-18
- **Affects:** `app/services/jobs.py`, `app/api/routes/admin.py`, `app/api/routes/collector_runs.py`

## Context

`run`, `heal` and `approve` each shell out to the Bright Data CLI. Their published
timeouts are not HTTP-shaped:

| Command | CLI default |
|---|---|
| `scraper run` (single URL) | 600 s |
| `scraper run` (batch) | 3600 s |
| `scraper heal` | 600 s |
| `scraper approve` | 600 s |
| `scraper create` | 5–25 minutes |

An earlier draft of this backend proposed a **30-second** subprocess timeout and synchronous
`POST /heal`. That does not merely risk a slow request — it makes the central feature of the
submission impossible. A heal that returns in 40 seconds would be killed, its collector left
in an unknown state, and the demo would fail on stage with a `504` while the repair it
triggered completed invisibly in Bright Data's infrastructure.

Reverse proxies, browsers and `fetch` all give up long before 600 s regardless of what we
configure.

## Decision

**Admin operations return `202 Accepted` and are polled.**

```
POST /api/collectors/{key}/heal  →  202 {run_id, poll_url, status: "QUEUED"}
GET  /api/collector-runs/{run_id} →  poll until status is SUCCEEDED or FAILED
```

The request handler does three things and returns: validate, insert a `CollectorRunRow` with
`status: QUEUED`, hand the row to the job runner. The CLI call happens in a background task.

Supporting choices:

- **`JobRunner` is `asyncio.create_task` plus `asyncio.Semaphore(cli_max_concurrency)`,
  default 1.** Not Celery, not Redis, not RQ. The account's AI-Flow limit is 3 concurrent
  jobs; serialising to 1 makes a live demo deterministic and removes a 429-and-backoff path
  we would otherwise have to write and test.
- **Timeouts are 660 s**, the CLI default plus headroom, per command and configurable.
- **The 202 body carries `poll_url`**, so a client builds no URLs.
- **Every terminal path writes a terminal status.** CLI failure, timeout, unexpected
  exception, and cancellation at application shutdown all record `FAILED` with a reason.
  A run never stays `RUNNING`, which is the property that lets a poller loop unconditionally.

## Consequences

Good:

- Healing works at all, including the ten-minute case.
- Progress is inspectable. `GET /api/collector-runs` is an audit trail rather than a log file,
  and `diff_summary`/`preview_rows` are stored on the run row, so the review screen survives a
  page refresh.
- Failures are data. "The CLI is not installed" arrives as a `FAILED` run with an actionable
  `error`, not as an HTTP 500 with a traceback.
- The frontend has one interaction pattern for all three operations.

Bad, and accepted:

- **Jobs do not survive a restart.** A `QUEUED` row whose process died is orphaned. Mitigated
  by recording `FAILED` on shutdown cancellation; a restart during a heal is a scenario we
  accept for a hackathon and state in the README's Known Limitations.
- **Two round trips** instead of one. Paid for by handing back `poll_url` and documenting a
  copy-pasteable polling loop in `docs/API_CONTRACT.md`.
- **In-process concurrency control only.** Two instances of the app would each allow 1
  concurrent job, exceeding the cap in aggregate. We run one instance.

## Alternatives rejected

**Synchronous with a long timeout.** Rejected: no client survives 600 s, and it converts a
slow success into a visible failure.

**Fire-and-forget with no run row.** Rejected: healing is precisely the case where you must be
able to answer "what did it propose and did anyone approve it?" after the fact.

**Celery or RQ with a broker.** Rejected on cost, not on correctness. It is the right answer
for production and the wrong answer for a seven-day build: a broker to install, configure,
run in CI and explain, in exchange for durability we do not need across a demo. The tradeoff
is written here so a reviewer sees it was a decision.

**Server-Sent Events or WebSockets for progress.** Rejected: the CLI reports nothing until it
finishes, so a stream would carry one message. Polling a row is simpler and gives the same
information.
