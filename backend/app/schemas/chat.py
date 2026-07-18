"""
app/schemas/chat.py
====================
Pydantic schemas for the Chat streaming API.
"""

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """
    Payload accepted by POST /chat/stream.

    ``use_profile`` controls whether the user's saved TravelProfile is
    injected into the prompt for personalised responses.  When False
    the model receives only the system prompt and the message, which is
    appropriate for anonymous-style questions that don't need context.
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