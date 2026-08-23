"""DTOs for ad-hoc and on-demand URL scraping."""

from pydantic import Field

from app.schemas.common import ApiModel


class AdHocScrapeIn(ApiModel):
    """Input payload for on-demand URL scraping."""

    url: str = Field(description="The public web URL to extract signals from.")
    prompt: str = Field(
        default=(
            "Extract announcement title, publication date, "
            "city location, technology domain, and summary."
        ),
        description="Extraction instructions or focus.",
    )


class AdHocSignalOut(ApiModel):
    """Normalized signal extracted on-demand."""

    signal_id: str
    title: str
    city: str
    domain: str
    source_url: str
    signal_type: str
    summary: str = ""


class AdHocScrapeOut(ApiModel):
    """Outcome of on-demand ad-hoc scraping."""

    success: bool
    collector_id: str
    records_extracted: int
    signals_saved: int
    rejected_records: int = 0
    signals: list[AdHocSignalOut] = Field(default_factory=list)
    error: str | None = None
