"""
app/services/sse_service.py
============================
Reusable Server-Sent Events (SSE) streaming utility.

This module owns the entire SSE wire format so that no other file needs
to know what a properly-framed SSE event looks like.  Routers pass an
async-generator of string tokens here; this module frames each token,
detects client disconnections, cleans up the upstream generator, and
always sends a terminal event.

SSE wire format (per the HTML spec)
------------------------------------
Each event is a line that starts with ``data:`` followed by a space and
the payload, terminated by a blank line (``\\n\\n``).

    data: <token>\\n\\n          — normal content chunk
    data: [DONE]\\n\\n           — clean completion signal
    data: [ERROR] <msg>\\n\\n    — error signal (provider / parse failure)

The ``[TRIP_ID] <uuid>`` marker is written by the caller (the journey
stream endpoint) as a special first-chunk before the token stream begins.
``sse_stream`` passes every yielded string through verbatim — it does not
inspect content — so the trip-id chunk is framed the same way:

    data: [TRIP_ID] <uuid>\\n\\n

Design decisions
----------------
- ``sse_stream`` is a plain async generator, not a class.  It has no
  state and is trivially composable.
- Client-disconnect detection uses ``await request.is_disconnected()``.
  This is a best-effort check: the ASGI spec guarantees it only after the
  OS has propagated the TCP RST, which can lag by one iteration.
- When a disconnect or upstream error is detected we call
  ``aclose()`` on the upstream generator to trigger its ``finally``
  block — this ensures any httpx response objects inside
  ``GroqService.stream_completion`` are always closed.
- ``sse_stream`` never raises; it converts every failure into an
  ``[ERROR]`` event so the HTTP response can always finish cleanly
  instead of leaving the client with an incomplete transfer.
"""

from __future__ import annotations

import logging
from typing import AsyncGenerator

from fastapi import Request

from app.ai.base import AIProviderError

logger = logging.getLogger(__name__)


def _frame(payload: str) -> str:
    """Wrap *payload* in an SSE ``data:`` frame with a trailing blank line."""
    return f"data: {payload}\n\n"


async def sse_stream(
    token_gen: AsyncGenerator[str, None],
    request: Request,
) -> AsyncGenerator[str, None]:
    """
    Wrap an async token generator as a properly-framed SSE byte stream.

    Args:
        token_gen:  Any async generator that yields string chunks.
                    Typically ``ai_provider.stream_completion(prompt)``.
        request:    The current FastAPI ``Request`` object used to detect
                    client disconnects via ``request.is_disconnected()``.

    Yields:
        SSE-framed strings ready to be consumed by ``StreamingResponse``.

    Guarantees:
        - Always ends with either ``data: [DONE]`` or ``data: [ERROR] …``.
        - Always calls ``aclose()`` on ``token_gen`` on any exit path,
          even if the caller stops iterating early.
        - Never raises — all exceptions are converted to ``[ERROR]`` events.
    """
    try:
        async for token in token_gen:
            # ── Client disconnected? ───────────────────────────────────────
            if await request.is_disconnected():
                logger.info("SSE: client disconnected — aborting stream.")
                return  # finally block will aclose() the generator

            # ── Forward token to client ────────────────────────────────────
            yield _frame(token)

        # ── Clean completion ───────────────────────────────────────────────
        yield _frame("[DONE]")

    except AIProviderError as exc:
        logger.error("SSE: AI provider error — %s", exc)
        yield _frame(f"[ERROR] {exc}")

    except GeneratorExit:
        # The downstream consumer (StreamingResponse) stopped reading.
        # Re-raise so the generator exits properly; finally will clean up.
        raise

    except Exception as exc:
        logger.error("SSE: unexpected error — %s", exc)
        yield _frame(f"[ERROR] {exc}")

    finally:
        # Always release the upstream generator's resources.
        await token_gen.aclose()