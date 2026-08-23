# ADR 0004 — healing is manual and approval-gated; no auto-heal

- **Status:** accepted
- **Date:** 2026-08-19
- **Affects:** `app/services/healing.py`, `app/api/routes/admin.py`, `app/infra/cli/bdata.py`,
  `docs/DEMO_SCRIPT.md`

## Context

The Bright Data CLI can repair a collector whose source page changed layout, and it offers
`--auto-approve` to apply the repair without a human looking at it. Detection is already ours:
a run's fill rate drops below 0.8 and the collector is flagged `DEGRADED`.

The tempting product is a closed loop — detect degradation, call `heal`, auto-approve, re-run —
and describe it as "self-healing infrastructure". The question is whether to build it.

## Decision

**No auto-heal, and `--auto-approve` is never passed.** A degraded collector is flagged and
stops there. A human calls `POST /heal`, reads the proposal, and calls `POST /approve`.

The gated heal is the whole point of the design:

```
DEGRADED ──POST /heal──▶ HEALING_REVIEW ──POST /approve──▶ HEALED
                              │
                     diff_summary + preview_rows
                     stored on the run row
```

`heal` returns `status: awaiting_approval` with `diff_summary`, `next_step` and
`preview_result`. Those are persisted onto the `CollectorRunRow` rather than only logged, so
the review survives a page refresh and remains readable minutes later. `approve` is a separate
CLI invocation, and the pending heal row is stamped when applied — approving twice is
`409 nothing_to_approve`, not a duplicate job.

Three reasons, in the order they actually mattered.

**1. Approving an AI-authored change to production extraction logic is a human decision.** A
heal rewrites the selectors a data pipeline depends on. Applied unreviewed, a plausible-looking
repair that grabs the wrong element produces *confident wrong data* — which is strictly worse
than the visible breakage it replaced. Fill rate would return to 1.0 and the map would fill
with garbage while every health indicator went green.

**2. An automatic loop hides the failure it repairs.** In a demo, a system that heals within
seconds of degrading shows a judge nothing: no red dashboard, no diff, no decision. The
observable middle state — `HEALING_REVIEW`, with the proposed selector change on screen — *is*
the demonstration. Auto-heal would delete the most interesting frame of the story.

**3. Less code, and none of it speculative.** Auto-heal needs a trigger policy, a prompt
generated without a human describing what changed, retry limits, loop-breaking when a repair
does not help, and a cooldown so a permanently dead page does not burn AI-Flow jobs in a cycle.
All of it untestable against a real broken site inside seven days.

## Consequences

Good:

- The dangerous operation requires a deliberate, authenticated, separately audited call.
- `GET /api/collector-runs` reads as a decision log: what degraded, what was proposed, who
  approved it, whether it worked.
- The demo has five clean steps with a human decision in the middle
  ([`../DEMO_SCRIPT.md`](../DEMO_SCRIPT.md)).
- Nothing in the codebase can apply a repair unattended, and that is verified: an AST scan over
  every module in `app/` fails if `--auto-approve` appears as a string literal outside a
  docstring, and a behavioural test asserts it is absent from every argv the application can
  build.

Costs, accepted and stated in the README:

- **Not autonomous.** A collector stays broken until someone acts. Acceptable: runs are
  manually triggered anyway, so nothing is silently rotting between demos.
- **The heal prompt is written by a human**, describing what moved on the page. That is also
  the honest version of the feature — the plain-English prompt is what makes the repair
  reviewable in the first place.
- **We claim less.** The README says "approval-gated AI healing workflow", not "self-healing
  infrastructure". Overclaiming costs more than the smaller scope does.

## Alternatives rejected

**Auto-heal with auto-approve on degradation.** Rejected: unreviewed AI changes to production
extraction logic, plus it hides the failure. Both above.

**Auto-heal that stops at `HEALING_REVIEW`** — automatic trigger, manual approval. Genuinely
tempting, and the natural next step. Rejected for this build only because the trigger needs a
generated prompt with no human describing the change, plus retry and cooldown policy, for a
feature whose demo value is already fully delivered by the manual path. Listed under **Planned**
in the README rather than pretended away.

**A "danger mode" flag enabling auto-approve.** Rejected: the flag exists to be turned on, and
the absence of `--auto-approve` from every code path is a stronger claim than a default.
