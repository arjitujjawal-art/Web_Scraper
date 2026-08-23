"""Run quality assessment and CLI input validation.

Two responsibilities, both pure:

1. Turn a batch of raw rows into a `RunReport` and a `CollectorHealth` verdict.
   This is what makes a broken collector *visible* — the fill-rate drop is the
   observable event in the self-healing demo, not a log line.
2. Validate everything before it is allowed to become a subprocess argument.
   Living here means it is unit-tested without spawning anything.
"""

import re
from collections.abc import Sequence

from app.domain.enums import CollectorHealth
from app.domain.models import RawRecord, RunReport

# Below this share of required fields populated, a collector is DEGRADED.
DEFAULT_FILL_RATE_THRESHOLD = 0.8

# Server-assigned collector identifiers are `c_` followed by a lowercase base36
# blob, e.g. c_mp3tuab31lswoxvpws. Anchored, with no shell metacharacters possible.
_COLLECTOR_ID = re.compile(r"^c_[a-z0-9]{6,40}$")

# The Bright Data CLI itself caps heal prompts at 1000 characters and validates
# before calling the API. Mirroring the limit lets us fail with a 422 instead of a
# confusing subprocess error.
MAX_HEAL_PROMPT_LENGTH = 1000
MIN_HEAL_PROMPT_LENGTH = 20


class ValidationError(ValueError):
    """Raised when input is unfit to become a CLI argument or a stored record."""


def validate_collector_id(value: str) -> str:
    """Return the collector id unchanged, or raise.

    This is defence in depth, not the primary control: arguments are passed as an
    argv list so no shell ever interprets them. It still runs, because a typo'd id
    should fail here rather than after a ten-minute CLI timeout.
    """
    candidate = value.strip()
    if not _COLLECTOR_ID.match(candidate):
        raise ValidationError(
            f"collector id must match {_COLLECTOR_ID.pattern!r}, got {value!r}. "
            "Ids are assigned by `brightdata scraper create` — you cannot choose them."
        )
    return candidate


def validate_heal_prompt(value: str) -> str:
    """Check a healing instruction before it reaches the CLI.

    A too-short prompt produces a vague heal; the Bright Data docs are explicit
    that "you are the detector" and that prompt quality determines the fix.
    """
    prompt = value.strip()
    if len(prompt) < MIN_HEAL_PROMPT_LENGTH:
        raise ValidationError(
            f"heal prompt must be at least {MIN_HEAL_PROMPT_LENGTH} characters — "
            "describe which selectors moved and where, or the fix will be a guess"
        )
    if len(prompt) > MAX_HEAL_PROMPT_LENGTH:
        raise ValidationError(
            f"heal prompt must be at most {MAX_HEAL_PROMPT_LENGTH} characters "
            f"(the CLI rejects longer), got {len(prompt)}"
        )
    return prompt


def build_run_report(
    records: Sequence[RawRecord],
    required_fields: Sequence[str],
    rejected_records: int = 0,
    rejection_reasons: Sequence[str] = (),
) -> RunReport:
    """Measure required-field coverage across a run.

    `fill_rate = populated required cells / (rows x required fields)`.

    A run with zero records gets a fill rate of 0.0 rather than an undefined 1.0:
    "returned nothing" is a failure, and treating an empty result as perfect
    coverage is how broken collectors stay green.
    """
    if not required_fields:
        raise ValidationError("required_fields must not be empty")

    total_cells = len(records) * len(required_fields)
    present = sum(1 for record in records for name in required_fields if record.has(name))

    missing = tuple(
        name for name in required_fields if not any(record.has(name) for record in records)
    )

    return RunReport(
        records_found=len(records),
        required_fields_total=total_cells,
        required_fields_present=present,
        fill_rate=round(present / total_cells, 4) if total_cells else 0.0,
        missing_fields=missing,
        rejected_records=rejected_records,
        rejection_reasons=tuple(rejection_reasons),
    )


def assess_health(
    report: RunReport,
    threshold: float = DEFAULT_FILL_RATE_THRESHOLD,
) -> CollectorHealth:
    """Classify a completed run.

    Healing is never triggered from here. Detection and repair are deliberately
    separate: an automatic heal would fix the collector before a judge could see
    the failure, which destroys the demo the whole submission is built around.
    See `docs/adr/0004-manual-healing-only.md`.
    """
    if report.is_empty:
        return CollectorHealth.DEGRADED
    return CollectorHealth.HEALTHY if report.fill_rate >= threshold else CollectorHealth.DEGRADED


def describe_degradation(report: RunReport) -> str:
    """Human-readable reason a collector was flagged, for the dashboard and logs."""
    if report.is_empty:
        return "collector returned no records"
    parts = [f"fill rate {report.fill_rate:.0%}"]
    if report.missing_fields:
        parts.append("missing in every record: " + ", ".join(report.missing_fields))
    if report.rejected_records:
        parts.append(f"{report.rejected_records} record(s) failed normalization")
    return "; ".join(parts)
