"""
app/routers/chat.py
====================
Chat streaming endpoint.

Endpoint
--------
POST /chat/stream   — stream an AI travel-chat response via SSE

Design notes
------------
- Authentication is required; the user's identity is used to optionally
  load their TravelProfile for personalised responses.
- The router calls ``PromptBuilder.for_chat`` then passes the prompt
  directly to ``ai_provider.stream_completion``.  It does NOT go through
  RecommendationService — chat does not create Trip records.
- ``sse_stream`` from ``app.services.sse_service`` wraps the token
  generator and handles all framing, disconnects, and errors.
- The route returns a ``StreamingResponse`` with media type
  ``text/event-stream`` and ``Cache-Control: no-cache``.
- The AIProvider is obtained via the same ``get_ai_provider()`` singleton
  used by the journey endpoints, preserving the IAM token cache.

Error → HTTP mapping
--------------------
Missing / invalid JWT          → 401 (handled by get_current_user)
Invalid request body           → 422 (handled by FastAPI automatically)
AI errors during streaming     → [ERROR] SSE event (no HTTP error status)
"""

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.ai.base import AIProvider
from app.ai.factory import get_ai_provider
from app.dependencies.auth import get_current_user
from app.dependencies.db import get_db
from app.models.travel_profile import TravelProfile
from app.models.user import User
from app.schemas.chat import ChatRequest
from app.services.prompt_builder import PromptBuilder
from app.services.sse_service import sse_stream

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post(
    "/stream",
    summary="Stream an AI travel-chat response",
    response_description="Server-Sent Events stream of text tokens.",
    responses={
        200: {"content": {"text/event-stream": {}}},
        401: {"description": "Not authenticated."},
        422: {"description": "Invalid request payload."},
    },
)
async def chat_stream(
    payload: ChatRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    ai_provider: AIProvider = Depends(get_ai_provider),
) -> StreamingResponse:
    """
    Stream a personalised AI travel-chat response token-by-token via SSE.

    Each SSE event carries one text chunk::

        data: <token>\\n\\n

    The stream terminates with::

        data: [DONE]\\n\\n

    or, on failure::

        data: [ERROR] <message>\\n\\n

    Set ``use_profile=true`` in the request body to inject the user's
    saved TravelProfile into the prompt for personalised recommendations.
    """
    # ── Optionally load TravelProfile ────────────────────────────────────
    travel_profile: TravelProfile | None = None
    if payload.use_profile:
        travel_profile = (
            db.query(TravelProfile)
            .filter(TravelProfile.user_id == current_user.id)
            .first()
        )

    # ── Convert history schema objects to plain dicts ─────────────────────
    history = [{"role": t.role, "content": t.content} for t in payload.history]

    # ── Build prompt ──────────────────────────────────────────────────────
    builder = PromptBuilder()
    prompt = builder.for_chat(
        payload.message,
        history=history or None,
        travel_profile=travel_profile,
    )

    # ── Stream through SSE utility ────────────────────────────────────────
    token_gen = ai_provider.stream_completion(prompt)

    return StreamingResponse(
        sse_stream(token_gen, request),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )