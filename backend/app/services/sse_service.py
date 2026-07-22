"""
app/services/sse_service.py
============================
Server-Sent Events (SSE) stream wrapper.

Wraps an async token generator into a standards-compliant SSE byte stream.
Each event is framed as:

    data: <token>\\n\\n

The stream terminates with:

    data: [DONE]\\n\\n

On any error:

    data: [ERROR] <message>\\n\\n

The generator also checks for client disconnection between tokens and
exits early if the client has already hung up — preventing unnecessary
AI provider calls and connection leaks.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

from fastapi import Request


async def sse_stream(
    token_gen: AsyncGenerator[str, None],
    request: Request,
) -> AsyncGenerator[bytes, None]:
    """
    Converts an async token generator into an SSE byte stream.

    Args:
        token_gen: Async generator yielding text tokens (strings).
        request:   The incoming FastAPI Request — used to detect client
                   disconnection between tokens.

    Yields:
        UTF-8 encoded SSE event bytes in the format ``data: <text>\\n\\n``.
        Terminates with ``data: [DONE]\\n\\n`` or ``data: [ERROR] ...\\n\\n``.
    """
    try:
        async for token in token_gen:
            # Stop early if the client disconnected mid-stream.
            if await request.is_disconnected():
                break
            # Each SSE event: "data: <content>\n\n"
            # Per the SSE spec, if the token contains newlines each line must
            # be prefixed with "data: " so the event is parsed correctly by
            # browsers and our own frontend reader.
            safe_token = token.replace("\n", "\ndata: ")
            yield f"data: {safe_token}\n\n".encode("utf-8")

        # Only send [DONE] if the client is still connected.
        if not await request.is_disconnected():
            yield b"data: [DONE]\n\n"

    except Exception as exc:  # noqa: BLE001
        # Surface errors as a final SSE event so the client can handle them.
        yield f"data: [ERROR] {exc!s}\n\n".encode("utf-8")
