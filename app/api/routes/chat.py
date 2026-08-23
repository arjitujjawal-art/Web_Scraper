"""The Signal Copilot endpoint (partner track).

Stateless: prior turns arrive in the request body. Every number in the reply comes
from a tool call against the same services the REST API uses, so the chat panel and
the map cannot disagree.

Returns 503 with `code: copilot_unavailable` when `ANTHROPIC_API_KEY` is unset.
Every other endpoint works without it — the Copilot is additive, never a
prerequisite.
"""

from fastapi import APIRouter

from app.api.deps import CopilotServiceDep
from app.schemas.chat import ChatCitation, ChatOut, ChatRequest

router = APIRouter(prefix="/chat", tags=["copilot"])


@router.post(
    "",
    response_model=ChatOut,
    summary="Ask the Signal Copilot",
    responses={503: {"description": "ANTHROPIC_API_KEY is not configured"}},
)
async def ask(body: ChatRequest, copilot: CopilotServiceDep) -> ChatOut:
    """Answer a question from stored signals, citing the ones used.

    `grounded` is False when no tool returned data. A client should render that
    honestly rather than styling the reply as a finding — an unsupported answer is
    the one output this feature must never make look authoritative.
    """
    answer = await copilot.answer(
        body.message,
        history=[{"role": turn.role, "content": turn.content} for turn in body.history],
    )
    return ChatOut(
        reply=answer.reply,
        citations=[ChatCitation.model_validate(signal) for signal in answer.citations],
        tools_used=list(answer.tools_used),
        grounded=answer.grounded,
    )
