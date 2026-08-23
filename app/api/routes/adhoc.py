"""Ad-hoc on-demand URL scraping endpoint."""

from fastapi import APIRouter, HTTPException

from app.api.deps import AdHocServiceDep
from app.schemas.adhoc import AdHocScrapeIn, AdHocScrapeOut

router = APIRouter(tags=["collectors"])


@router.post(
    "/collectors/ad-hoc",
    response_model=AdHocScrapeOut,
    summary="Scrape custom URL on-demand",
)
async def scrape_custom_url(
    req: AdHocScrapeIn,
    service: AdHocServiceDep,
) -> AdHocScrapeOut:
    """Scrapes any arbitrary public URL based on user intent and stores resulting signals."""
    result = await service.scrape_adhoc_url(req.url, req.prompt)
    if not result.get("success"):
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "Extraction failed"),
        )
    return AdHocScrapeOut.model_validate(result)
