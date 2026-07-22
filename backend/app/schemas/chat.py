"""
app/schemas/chat.py
====================
Pydantic schemas for the Chat streaming API.
"""

from pydantic import BaseModel, Field


class ChatTurn(BaseModel):
    """A single turn in the conversation history."""

    role: str = Field(
        ...,
        description="Either 'user' or 'assistant'.",
        pattern="^(user|assistant)$",
    )
    content: str = Field(
        ...,
        min_length=1,
        max_length=4000,
        description="The text of this conversation turn.",
    )


class ChatRequest(BaseModel):
    """
    Payload accepted by POST /chat/stream.

    ``use_profile`` controls whether the user's saved TravelProfile is
    injected into the prompt for personalised responses.

    ``history`` carries the recent conversation turns (oldest first,
    newest last) so the model can maintain relevant context across
    messages.  The frontend is responsible for trimming this to the
    most recent turns; the backend caps it at 6 turns defensively.
    """

    message: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="The user's travel question or request.",
        examples=["What are the best hidden gems in Kyoto?"],
    )
    use_profile: bool = Field(
        default=False,
        description=(
            "When True, the user's saved TravelProfile is loaded and injected "
            "into the prompt so the response is personalised to their preferences."
        ),
    )
    history: list[ChatTurn] = Field(
        default_factory=list,
        max_length=6,
        description=(
            "Recent conversation turns (oldest first, newest last). "
            "Capped at 6 turns. Used to maintain relevant context across messages."
        ),
    )
