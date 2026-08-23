"""Chat DTOs for the Signal Copilot (partner track).

Two properties are worth naming because they are design decisions, not defaults.

The server is **stateless**: prior turns arrive in the request. No session store,
no expiry, nothing to leak between users — and for a demo chat panel, resending
twenty turns costs nothing.

Every response carries `citations` and `grounded`. An answer that cites nothing and
does not say "I don't have that data" is a bug, and the Copilot tests assert
exactly that. This is the schema-level defence against the failure mode the earlier
review caught: a chatbot confidently reporting a hardcoded score.
"""

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import ApiModel


class ChatTurn(BaseModel):
    """One prior turn, replayed by the client."""

    model_config = ConfigDict(extra="forbid")

    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    """Body for `POST /api/chat` — the Copilot's only entry point."""

    model_config = ConfigDict(extra="forbid")

    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatTurn] = Field(
        default_factory=list,
        max_length=20,
        description="Prior turns, oldest first. The server holds no session state.",
    )


class ChatCitation(ApiModel):
    """A signal the answer was grounded in."""

    signal_id: str
    title: str
    city: str
    domain: str
    source_url: str


class ChatOut(ApiModel):
    """`POST /api/chat` response."""

    reply: str
    citations: list[ChatCitation] = Field(default_factory=list)
    tools_used: list[str] = Field(default_factory=list)
    grounded: bool = Field(
        default=False,
        description="True when at least one tool returned data that backs the reply.",
    )
