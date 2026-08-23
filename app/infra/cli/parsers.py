"""Two parsers, because the CLI has two output shapes.

Kept separate from `bdata.py` so they can be unit-tested against recorded stdout
with no subprocess involved — which is also how the shapes were pinned down in
the first place.

Both parsers are total: any input either produces a value or raises
`CliOutputError`. Neither returns a half-populated object, because a half-parsed
envelope is how a failed heal gets recorded as a success.
"""

import json
from collections.abc import Mapping, Sequence
from typing import Any

from app.infra.cli.protocol import (
    CliJobStatus,
    CliOutputError,
    JobOutcome,
    RunOutcome,
)

# Envelope keys we lift into `JobOutcome` fields; anything else lands in `extra`
# so a CLI upgrade adds information instead of losing it.
_KNOWN_ENVELOPE_KEYS = frozenset(
    {
        "collector_id",
        "collectorId",
        "id",
        "status",
        "completed_steps",
        "completedSteps",
        "view_url",
        "viewUrl",
        "created_at",
        "createdAt",
        "error",
        "message",
        "diff_summary",
        "diffSummary",
        "next_step",
        "nextStep",
        "preview_result",
        "previewResult",
    }
)


def _first(payload: Mapping[str, Any], *names: str) -> Any:
    """Return the first present key, tolerating snake_case/camelCase drift."""
    for name in names:
        if name in payload and payload[name] is not None:
            return payload[name]
    return None


def _as_str_tuple(value: Any) -> tuple[str, ...]:
    if value is None:
        return ()
    if isinstance(value, str):
        return (value,)
    if isinstance(value, Sequence):
        return tuple(str(item) for item in value)
    return (str(value),)


def _as_row_tuple(value: Any) -> tuple[Mapping[str, Any], ...]:
    """Coerce a rows-ish payload into a tuple of mappings, ignoring stray scalars."""
    if value is None:
        return ()
    if isinstance(value, Mapping):
        return (dict(value),)
    if isinstance(value, str):
        try:
            return _as_row_tuple(json.loads(value))
        except json.JSONDecodeError:
            return ()
    if isinstance(value, Sequence):
        return tuple(dict(item) for item in value if isinstance(item, Mapping))
    return ()


def _loads(stdout: str, *, expecting: str) -> Any:
    """Decode CLI stdout, tolerating banner lines printed before the JSON.

    The CLI writes progress to stderr, but a login notice or an update warning on
    stdout has been observed; slicing from the first bracket is cheaper and more
    robust than pinning a CLI version.
    """
    text = stdout.strip()
    if not text:
        raise CliOutputError(f"expected {expecting} but the CLI printed nothing")

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    start = min((pos for pos in (text.find("["), text.find("{")) if pos != -1), default=-1)
    if start > 0:
        try:
            return json.loads(text[start:])
        except json.JSONDecodeError:
            pass

    preview = text if len(text) <= 400 else f"{text[:400]}..."
    raise CliOutputError(f"expected {expecting}, got unparseable output: {preview}")


def parse_run_output(stdout: str, collector_id: str) -> RunOutcome:
    """Parse `scraper run --json`, which prints a bare JSON array of rows.

    Rows are best-effort: a field the collector could not find is **omitted**, not
    set to null. Nothing here fills a default, because a filled default is
    indistinguishable from a successful scrape and would hide exactly the
    degradation this project detects.
    """
    payload = _loads(stdout, expecting="a JSON array of scraped rows")

    if isinstance(payload, Mapping):
        # Some CLI paths wrap rows in {"data": [...]} or report an error object.
        error = _first(payload, "error", "message")
        rows_field = _first(payload, "data", "results", "rows", "preview_result")
        if rows_field is None and error:
            raise CliOutputError(f"run returned an error object: {error}")
        rows = _as_row_tuple(rows_field)
    elif isinstance(payload, Sequence):
        rows = _as_row_tuple(payload)
    else:
        raise CliOutputError(f"run returned {type(payload).__name__}, expected an array")

    return RunOutcome(collector_id=collector_id, rows=rows)


def parse_status(value: Any) -> CliJobStatus:
    """Map an envelope `status` string onto `CliJobStatus`.

    Unrecognised values become `UNKNOWN` rather than raising: a new intermediate
    status in a future CLI release should not take the endpoint down.
    """
    if not isinstance(value, str):
        return CliJobStatus.UNKNOWN
    normalized = value.strip().casefold().replace("-", "_").replace(" ", "_")
    try:
        return CliJobStatus(normalized)
    except ValueError:
        return CliJobStatus.UNKNOWN


def parse_job_output(stdout: str, fallback_collector_id: str) -> JobOutcome:
    """Parse a `create`/`heal`/`approve --json` envelope.

    A gated heal returns `status: "awaiting_approval"` together with
    `preview_result`, `diff_summary` and `next_step`. Those three fields are the
    proposed repair; they are lifted onto the outcome so a route can render them
    without touching raw JSON.
    """
    payload = _loads(stdout, expecting="a JSON status envelope")
    if not isinstance(payload, Mapping):
        raise CliOutputError(f"expected a JSON object, got {type(payload).__name__}")

    status = parse_status(_first(payload, "status"))
    error = _first(payload, "error", "message")
    collector_id = _first(payload, "collector_id", "collectorId", "id")

    return JobOutcome(
        collector_id=str(collector_id or fallback_collector_id),
        status=status,
        completed_steps=_as_str_tuple(_first(payload, "completed_steps", "completedSteps")),
        view_url=_optional_str(_first(payload, "view_url", "viewUrl")),
        created_at=_optional_str(_first(payload, "created_at", "createdAt")),
        error=_optional_str(error),
        diff_summary=_optional_str(_first(payload, "diff_summary", "diffSummary")),
        next_step=_optional_str(_first(payload, "next_step", "nextStep")),
        preview_rows=_as_row_tuple(_first(payload, "preview_result", "previewResult")),
        extra={key: value for key, value in payload.items() if key not in _KNOWN_ENVELOPE_KEYS},
    )


def _optional_str(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None
