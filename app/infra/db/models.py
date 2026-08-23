"""Persistence rows, and the mapping between them and the domain types.

The mapping lives here, next to the columns, rather than in the services layer.
That keeps `services/` free of `sqlalchemy` vocabulary and means a schema change
touches one file.

Two tables:

* `signals` — the evidence. Primary key is the deterministic `signal_id`, so
  re-running a collector upserts instead of duplicating. That is what makes the
  demo's "run it again after healing" step idempotent.
* `collector_runs` — every `run`, `heal` and `approve`, with its quality verdict.
  There is no `scraper list` or `scraper status` command in the CLI, so this table
  *is* the collector dashboard's data source.
"""

from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import JSON, Enum, Float, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.enums import (
    CollectorAction,
    CollectorHealth,
    RunStatus,
    SignalType,
    SourceType,
)
from app.domain.models import NormalizedSignal, RunReport
from app.infra.db.base import Base, UtcDateTime


def _enum_column(enum_type: type, length: int = 32) -> Enum:
    """Store an enum as its `str` value, portable across SQLite and Postgres.

    `native_enum=False` avoids CREATE TYPE, and `values_callable` writes the
    lowercase wire value rather than the Python member name — so a raw
    `SELECT source_type FROM signals` reads the same as the JSON API.
    """
    return Enum(
        enum_type,
        native_enum=False,
        length=length,
        values_callable=lambda enum: [member.value for member in enum],
    )


def new_run_id() -> str:
    """Short, sortable-enough identifier for a job row."""
    return f"run_{uuid4().hex[:12]}"


class SignalRow(Base):
    """One deduplicated, normalized signal."""

    __tablename__ = "signals"
    __table_args__ = (
        Index("ix_signals_city_domain", "city", "domain"),
        Index("ix_signals_domain_date", "domain", "date"),
    )

    signal_id: Mapped[str] = mapped_column(String(160), primary_key=True)
    collector_key: Mapped[str] = mapped_column(String(64), index=True)
    source_type: Mapped[SourceType] = mapped_column(_enum_column(SourceType))
    source_url: Mapped[str] = mapped_column(Text)
    title: Mapped[str] = mapped_column(Text)
    summary: Mapped[str] = mapped_column(Text)
    date: Mapped[datetime] = mapped_column(UtcDateTime, index=True)
    city: Mapped[str] = mapped_column(String(64), index=True)
    domain: Mapped[str] = mapped_column(String(64), index=True)
    signal_type: Mapped[SignalType] = mapped_column(_enum_column(SignalType))
    area: Mapped[str | None] = mapped_column(String(64), nullable=True)
    extracted_at: Mapped[datetime] = mapped_column(UtcDateTime)
    # Grows when deduplication merges reports of one event. The count behind
    # "3 outlets reported this, counted once".
    evidence_urls: Mapped[list[str]] = mapped_column(JSON, default=list)

    @classmethod
    def from_domain(cls, signal: NormalizedSignal) -> "SignalRow":
        """Build a row from a domain signal, without touching the session."""
        return cls(
            signal_id=signal.signal_id,
            collector_key=signal.collector_key,
            source_type=signal.source_type,
            source_url=signal.source_url,
            title=signal.title,
            summary=signal.summary,
            date=signal.date,
            city=signal.city,
            domain=signal.domain,
            signal_type=signal.signal_type,
            area=signal.area,
            extracted_at=signal.extracted_at,
            evidence_urls=list(signal.evidence_urls),
        )

    def to_domain(self) -> NormalizedSignal:
        """Convert back to the frozen domain type the pipeline works with."""
        return NormalizedSignal(
            signal_id=self.signal_id,
            collector_key=self.collector_key,
            source_type=SourceType(self.source_type),
            source_url=self.source_url,
            title=self.title,
            date=self.date,
            city=self.city,
            domain=self.domain,
            signal_type=SignalType(self.signal_type),
            summary=self.summary,
            extracted_at=self.extracted_at,
            area=self.area,
            evidence_urls=tuple(self.evidence_urls or ()),
        )


class CollectorRunRow(Base):
    """One CLI operation and everything observed about it.

    The healing columns (`cli_status`, `diff_summary`, `next_step`,
    `preview_rows`) are populated by a `heal` that came back
    `awaiting_approval`. They are what the review screen renders — the proposed
    repair, before a human applies it.
    """

    __tablename__ = "collector_runs"
    __table_args__ = (Index("ix_collector_runs_key_started", "collector_key", "started_at"),)

    run_id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_run_id)
    collector_key: Mapped[str] = mapped_column(String(64), index=True)
    collector_id: Mapped[str] = mapped_column(String(64))
    action: Mapped[CollectorAction] = mapped_column(_enum_column(CollectorAction))
    status: Mapped[RunStatus] = mapped_column(
        _enum_column(RunStatus), default=RunStatus.QUEUED, index=True
    )
    health: Mapped[CollectorHealth] = mapped_column(
        _enum_column(CollectorHealth), default=CollectorHealth.UNKNOWN
    )

    target_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # --- quality verdict (mirrors domain.RunReport) -------------------------
    records_found: Mapped[int] = mapped_column(Integer, default=0)
    records_stored: Mapped[int] = mapped_column(Integer, default=0)
    required_fields_total: Mapped[int] = mapped_column(Integer, default=0)
    required_fields_present: Mapped[int] = mapped_column(Integer, default=0)
    fill_rate: Mapped[float] = mapped_column(Float, default=0.0)
    missing_fields: Mapped[list[str]] = mapped_column(JSON, default=list)
    rejected_records: Mapped[int] = mapped_column(Integer, default=0)
    rejection_reasons: Mapped[list[str]] = mapped_column(JSON, default=list)

    # --- healing envelope ---------------------------------------------------
    cli_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    view_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    diff_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    next_step: Mapped[str | None] = mapped_column(Text, nullable=True)
    preview_rows: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON, nullable=True)
    heal_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)

    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_payload_path: Mapped[str | None] = mapped_column(Text, nullable=True)

    started_at: Mapped[datetime] = mapped_column(UtcDateTime, index=True)
    finished_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)

    def apply_report(self, report: RunReport) -> None:
        """Copy a domain quality verdict onto the row."""
        self.records_found = report.records_found
        self.required_fields_total = report.required_fields_total
        self.required_fields_present = report.required_fields_present
        self.fill_rate = report.fill_rate
        self.missing_fields = list(report.missing_fields)
        self.rejected_records = report.rejected_records
        self.rejection_reasons = list(report.rejection_reasons)

    def to_report(self) -> RunReport:
        """Rebuild the domain verdict from the stored columns."""
        return RunReport(
            records_found=self.records_found,
            required_fields_total=self.required_fields_total,
            required_fields_present=self.required_fields_present,
            fill_rate=self.fill_rate,
            missing_fields=tuple(self.missing_fields or ()),
            rejected_records=self.rejected_records,
            rejection_reasons=tuple(self.rejection_reasons or ()),
        )
