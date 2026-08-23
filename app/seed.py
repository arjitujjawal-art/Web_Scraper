"""Load the committed sample dataset into the database.

The seeder exists so the API is useful before a single Bright Data collector has
been created: the frontend can build against real zones, and the Copilot can be
demonstrated answering from stored rows rather than from a fixture.

Two decisions are worth knowing about.

**Seed rows go through the real normalizer.** `seed/signals_seed.json` holds *raw
collector rows*, not finished signals, so the technology domain, the signal type
and the coordinates are inferred by exactly the code a live run uses. Writing
`NormalizedSignal`s directly would let the seed drift away from the pipeline and
hide a normalizer regression behind a pretty map.

**A rejected record aborts the seed.** Nothing is written unless every row
normalizes. A half-loaded dataset scores differently from a full one, and
debugging "why is Delhi/IoT 2.1 today" is not worth the convenience of a partial
success. That also turns the seed file into a standing test of the normalizer.

Usage:
    py -3.12 -m app.seed              # upsert into the configured database
    py -3.12 -m app.seed --reset      # drop and recreate the schema first
    py -3.12 -m app.seed --dry-run    # normalize and report, write nothing
"""

import argparse
import asyncio
import json
from collections.abc import Mapping, Sequence
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from app.config import PROJECT_ROOT, Settings, get_settings
from app.domain.convergence import build_zones
from app.domain.enums import SourceType
from app.domain.models import NormalizedSignal, RawRecord
from app.domain.normalizer import normalize_batch
from app.infra.db.repositories import SignalRepository
from app.infra.db.session import (
    create_engine,
    create_schema,
    create_session_factory,
    drop_schema,
    session_scope,
)
from app.services.clock import utcnow

DEFAULT_SEED_FILE = PROJECT_ROOT / "seed" / "signals_seed.json"

# Keys consumed by the seeder itself, or notes for a human reader. Everything
# else in a record is handed to the normalizer as a collector field.
_DAYS_AGO = "days_ago"
_TOP_ZONES = 10


class SeedError(RuntimeError):
    """Raised when the seed file cannot be turned into a clean dataset."""


def _text(value: object) -> str | None:
    """Coerce an optional JSON value to a stripped string, or None."""
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _load_batches(path: Path) -> list[dict[str, Any]]:
    """Read the seed file and return its collector batches."""
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise SeedError(f"seed file not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise SeedError(f"seed file is not valid JSON: {exc}") from exc

    if not isinstance(payload, dict):
        raise SeedError("seed file must contain a JSON object")
    batches = payload.get("batches")
    if not isinstance(batches, list) or not batches:
        raise SeedError("seed file must contain a non-empty `batches` array")
    return [batch for batch in batches if isinstance(batch, dict)]


def _record_of(raw: Mapping[str, Any], collector_key: str, now: datetime) -> RawRecord:
    """Turn one seed row into a collector row, resolving `days_ago` to a date.

    Relative ages are the whole point: the score decays with `e^(-0.1 * age)`, so
    a seed file full of absolute dates would produce a lively map on the day it was
    written and a flat one a month later.
    """
    days_ago = raw.get(_DAYS_AGO)
    if not isinstance(days_ago, int) or isinstance(days_ago, bool) or days_ago < 0:
        raise SeedError(f"{collector_key}: `days_ago` must be a non-negative integer")

    fields: dict[str, Any] = {
        key: value for key, value in raw.items() if key != _DAYS_AGO and not key.startswith("_")
    }
    fields["date"] = (now - timedelta(days=days_ago)).date().isoformat()
    return RawRecord(
        fields=fields,
        collector_key=collector_key,
        source_url=_text(fields.get("url")),
    )


def _normalize(
    batches: Sequence[Mapping[str, Any]], now: datetime
) -> tuple[tuple[NormalizedSignal, ...], tuple[str, ...]]:
    """Normalize every batch, returning the signals and any rejection reasons."""
    signals: list[NormalizedSignal] = []
    problems: list[str] = []

    for batch in batches:
        key = _text(batch.get("collector_key"))
        if key is None:
            raise SeedError("every batch needs a `collector_key`")
        try:
            source_type = SourceType(str(batch.get("source_type", "")))
        except ValueError as exc:
            raise SeedError(f"{key}: unknown source_type {batch.get('source_type')!r}") from exc

        rows = batch.get("records")
        if not isinstance(rows, list) or not rows:
            raise SeedError(f"{key}: `records` must be a non-empty array")

        records = tuple(_record_of(row, key, now) for row in rows)
        outcome = normalize_batch(records, source_type, now, _text(batch.get("city_hint")))
        signals.extend(outcome.signals)
        problems.extend(f"{key}[{index}]: {reason}" for index, reason in outcome.rejections)

    return tuple(signals), tuple(problems)


def _report(signals: Sequence[NormalizedSignal], now: datetime) -> None:
    """Print what the dataset will look like once scored.

    Printed before writing so a `--dry-run` tells you whether the map will be worth
    looking at, without touching the database.
    """
    zones = build_zones(signals, now)
    merged = sum(zone.signal_count - zone.deduplicated_count for zone in zones)

    print(f"normalized      : {len(signals)} signals")
    print(f"merged as dupes : {merged}")
    print(f"zones           : {len(zones)}")
    for zone in zones[:_TOP_ZONES]:
        print(
            f"  {zone.score:6.2f}  {zone.confidence.value:<6}  {zone.zone_id:<28}"
            f"  {zone.deduplicated_count} events / {zone.distinct_source_types} sources"
        )
    if len(zones) > _TOP_ZONES:
        print(f"  ... and {len(zones) - _TOP_ZONES} more")


async def _write(signals: Sequence[NormalizedSignal], settings: Settings, *, reset: bool) -> int:
    """Create the schema if needed and upsert the signals.

    Uses `session_scope` rather than a request-scoped session because there is no
    request here: the script owns its transaction and commits once at the end.
    """
    engine = create_engine(settings.database_url)
    try:
        if reset:
            await drop_schema(engine)
        await create_schema(engine)
        factory = create_session_factory(engine)
        async with session_scope(factory) as session:
            return await SignalRepository(session).upsert_many(signals)
    finally:
        await engine.dispose()


def _parse_args(argv: Sequence[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="py -3.12 -m app.seed",
        description="Load seed/signals_seed.json into the configured database.",
    )
    parser.add_argument(
        "--seed-file", type=Path, default=DEFAULT_SEED_FILE, help="Alternative dataset to load."
    )
    parser.add_argument(
        "--reset", action="store_true", help="Drop every table before loading. Destructive."
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Normalize and report, but write nothing."
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    """Run the seeder. Returns a process exit code."""
    args = _parse_args(argv)
    now = utcnow()

    try:
        signals, problems = _normalize(_load_batches(args.seed_file), now)
    except SeedError as exc:
        print(f"seed aborted: {exc}")
        return 1

    if problems:
        print(f"seed aborted: {len(problems)} record(s) were rejected by the normalizer")
        for problem in problems:
            print(f"  - {problem}")
        return 1
    if not signals:
        print("seed aborted: the seed file produced no signals")
        return 1

    _report(signals, now)
    if args.dry_run:
        print("dry run: nothing written")
        return 0

    settings = get_settings()
    stored = asyncio.run(_write(signals, settings, reset=args.reset))
    print(f"stored {stored} signals in {settings.database_url}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
