"""Signal reads — the evidence layer, browsable on its own."""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import SignalServiceDep
from app.domain.enums import SourceType
from app.schemas.common import PageMeta
from app.schemas.signals import SignalListOut, SignalOut

router = APIRouter(prefix="/signals", tags=["signals"])


@router.get("", response_model=SignalListOut, summary="List signals")
async def list_signals(
    signals: SignalServiceDep,
    city: Annotated[str | None, Query(max_length=64)] = None,
    domain: Annotated[str | None, Query(max_length=64)] = None,
    source_type: SourceType | None = None,
    since: datetime | None = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> SignalListOut:
    """Newest-first page of signals, filtered.

    `source_type` is typed as the enum, so an unknown value is a 422 listing the
    four valid categories rather than a silently empty result.
    """
    page = await signals.search(
        city=city,
        domain=domain,
        source_type=source_type,
        since=since,
        limit=limit,
        offset=offset,
    )
    return SignalListOut(
        items=[SignalOut.model_validate(signal) for signal in page.items],
        meta=PageMeta(
            total=page.total, limit=page.limit, offset=page.offset, has_more=page.has_more
        ),
    )


@router.get("/{signal_id}", response_model=SignalOut, summary="Get one signal")
async def get_signal(signal_id: str, signals: SignalServiceDep) -> SignalOut:
    """One signal by id, for a citation link out of the chat panel."""
    signal = await signals.get(signal_id)
    if signal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"no signal {signal_id!r}"
        )
    return SignalOut.model_validate(signal)
