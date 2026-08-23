# ADR 0003 — the source-concentration cap is solved for, not approximated

- **Status:** accepted
- **Date:** 2026-08-19
- **Affects:** `app/domain/convergence.py`, `tests/unit/domain/test_convergence.py`

## Context

The emergence score sums decayed, weighted evidence for one `(city, domain)` bin:

```
S = Σ w(signal_type) · e^(−λ · age_days)      λ = 0.1
w: facility_expansion 3.0 · research_grant 2.0 · tech_event 1.0
```

Left alone, that number rewards volume from a single chatty source. One university press
office publishing weekly outranks a genuine convergence of a lab opening, a grant and a
meetup — which inverts the entire thesis of the project. Deduplication (`app/domain/dedup.py`)
handles *the same event reported twice*; it does nothing about *one source reporting many
different events*.

So the rule: **no single `source_type` may account for more than 60% of a zone's final score.**

The obvious implementation — the one in the reviewed draft — clips the dominant contribution
to `total × 0.6` and re-sums. It does not satisfy its own rule.

Contributions `A = 80`, `B = 20`, `total = 100`:

```
clip A to 100 × 0.6 = 60
final = 60 + 20 = 80
A's share of the final = 60 / 80 = 75%     ← above the 60% ceiling it just enforced
```

The error is using the **pre-cap** total as the denominator for a ceiling defined against the
**post-cap** score. A cap that silently fails to cap is worse than no cap: it is a number on a
map that a judge can disprove with arithmetic.

## Decision

Solve the invariant instead of approximating it. Let `dominant` be the largest per-source
contribution and `others = total − dominant`. The dominant source's share of the final score
must satisfy `(final − others) / final ≤ cap`, which rearranges to:

```python
final = min(total, others / (1 - cap))       # cap = 0.6
dominant_capped = final - others
```

Same inputs, `A = 80`, `B = 20`:

```
others = 20
final  = min(100, 20 / 0.4) = 50
A contributes 50 − 20 = 30 → 30 / 50 = 60%   ← exactly the ceiling
```

When the mix is already compliant, `others / (1 − cap)` exceeds `total`, the `min` selects
`total`, and the score is untouched. No special case needed for the healthy path.

**The single-source case has no solution.** With `others = 0`, any positive score gives the
lone source 100%. Rather than divide by zero or return 0.0, it is handled explicitly:

```python
final = total * cap          # 60% of the raw sum
```

and `confidence_for(1)` labels the zone `LOW`, with `was_capped: true` on the wire. The score
is reduced *and* the reason is visible — a quietly reduced score with no explanation reads as
a bug.

**Nothing is rounded in the domain.** An earlier version rounded the score to 2 dp and the
breakdown to 4 dp, which broke the invariant on small scores: a `0.0123` final rounds to
`0.01` and the dominant share reads 0.74. Display rounding lives in `app/schemas/`
(`DISPLAY_PRECISION = 3`); `app/domain/` keeps the arithmetic exact.

`apply_source_cap` returns the final score **and** the per-source breakdown whose `capped`
values sum to that score, so `contributions` on the API is a genuine decomposition rather
than a parallel calculation that could drift.

## Enforcement

- A property test over randomised contribution mixes asserts
  `max_source_share(score, breakdown) <= SOURCE_CAP_RATIO + 1e-9` for every zone with two or
  more source types.
- A test asserts the specific `80/20 → 50` case, with the naive `80` named in the comment so
  nobody "simplifies" it back.
- A test asserts `sum(c.capped for c in breakdown) == pytest.approx(score)`.
- A test asserts the single-source clamp lands on `total × cap` with `LOW` confidence.
- Decay is asserted monotonic in age, and `confidence_for` at the 1/2/3 boundaries.

## Consequences

Good: the published rule is true, and checkable by a judge with a calculator against the
`contributions` array the API already returns. `was_capped` and `confidence` make the
adjustment legible on the map — a capped `LOW` zone looks different from real convergence,
which is the distinction the product is about.

Costs, accepted:

- **Capping can reduce a zone's score by a lot** — 100 → 50 in the example. Intended: a zone
  with one source has not converged, and the number should say so.
- **Scores are not comparable to a naive weighted sum**, so they are presented as relative
  ranking, not as an absolute quantity with units.
- **`final` depends on the whole mix**, so adding a signal to a non-dominant source can raise
  the dominant source's own capped contribution. That is what the invariant requires, and it
  is why the breakdown is returned rather than recomputed by the client.

## Alternatives rejected

**Clip to `total × cap` and re-sum.** Rejected: does not enforce its own rule, shown above.

**Iterate to a fixed point.** Rejected: converges to the same answer the closed form gives
directly, with a loop and a tolerance to explain.

**Cap per source at `1 / n_sources` share.** Rejected: makes the ceiling depend on how many
categories happen to be present, so the same evidence scores differently as unrelated sources
appear.

**Drop the cap and lean on `confidence` alone.** Rejected: the score is what sorts the map and
what the ranking is read from. A single prolific source would still sit at the top with a `LOW`
badge nobody reads.
