"""
tests/services/test_sse_service.py
====================================
Unit tests for app/services/sse_service.py.

Strategy
--------
- All tests are async (asyncio_mode=auto from pytest.ini).
- No FastAPI, no HTTP — tested as pure async generators.
- The ``request`` argument is mocked with a simple async callable so
  we can control the disconnection signal.
- Token generators are inline async generators in the test body.

Coverage
--------
- Happy path: tokens framed + [DONE] appended.
- Empty generator: only [DONE] emitted.
- Client disconnects mid-stream: generator closed cleanly, no more tokens.
- AIProviderError mid-stream: [ERROR] event emitted, generator closed.
- Unexpected exception mid-stream: [ERROR] event emitted, generator closed.
- Cleanup: aclose() is always called on the upstream generator.
"""

from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.ai.base import AIProviderError, AITimeoutError
from app.services.sse_service import sse_stream, _frame


# ---------------------------------------------------------------------------
# Helper: build a fake Request whose is_disconnected() can be toggled
# ---------------------------------------------------------------------------

def _make_request(*, disconnected_after: int = 9999) -> MagicMock:
    """
    Returns a mock Request.  ``is_disconnected()`` returns True once the
    stream has been iterated ``disconnected_after`` times.
    """
    counter = {"calls": 0}

    async def _is_disconnected():
        counter["calls"] += 1
        return counter["calls"] > disconnected_after

    req = MagicMock()
    req.is_disconnected = _is_disconnected
    return req


async def _collect(gen) -> list[str]:
    """Drain an async generator into a list."""
    results = []
    async for item in gen:
        results.append(item)
    return results


# ---------------------------------------------------------------------------
# _frame helper
# ---------------------------------------------------------------------------

class TestFrameHelper:
    def test_wraps_in_data_prefix_and_double_newline(self):
        assert _frame("hello") == "data: hello\n\n"

    def test_empty_string(self):
        assert _frame("") == "data: \n\n"

    def test_multiword_payload(self):
        assert _frame("[DONE]") == "data: [DONE]\n\n"


# ---------------------------------------------------------------------------
# Happy-path streaming
# ---------------------------------------------------------------------------

class TestSseStreamHappyPath:
    async def _make_gen(self, tokens: list[str]):
        for t in tokens:
            yield t

    @pytest.mark.asyncio
    async def test_frames_each_token(self):
        req = _make_request()
        gen = self._make_gen(["Hello", ", ", "world"])
        result = await _collect(sse_stream(gen, req))
        assert result[0] == "data: Hello\n\n"
        assert result[1] == "data: , \n\n"
        assert result[2] == "data: world\n\n"

    @pytest.mark.asyncio
    async def test_appends_done_on_clean_completion(self):
        req = _make_request()
        gen = self._make_gen(["A", "B"])
        result = await _collect(sse_stream(gen, req))
        assert result[-1] == "data: [DONE]\n\n"

    @pytest.mark.asyncio
    async def test_empty_generator_emits_only_done(self):
        req = _make_request()

        async def _empty():
            return
            yield  # make it an async generator

        result = await _collect(sse_stream(_empty(), req))
        assert result == ["data: [DONE]\n\n"]

    @pytest.mark.asyncio
    async def test_total_event_count_is_tokens_plus_done(self):
        req = _make_request()
        tokens = ["tok1", "tok2", "tok3"]
        gen = self._make_gen(tokens)
        result = await _collect(sse_stream(gen, req))
        assert len(result) == len(tokens) + 1  # tokens + [DONE]

    @pytest.mark.asyncio
    async def test_trip_id_marker_passed_through_verbatim(self):
        """The [TRIP_ID] prefix is content — sse_stream does not inspect it."""
        req = _make_request()
        trip_id = "abc-123-def"

        async def _gen():
            yield f"[TRIP_ID] {trip_id}"
            yield "token"

        result = await _collect(sse_stream(_gen(), req))
        assert result[0] == f"data: [TRIP_ID] {trip_id}\n\n"
        assert result[1] == "data: token\n\n"
        assert result[2] == "data: [DONE]\n\n"


# ---------------------------------------------------------------------------
# Client disconnect
# ---------------------------------------------------------------------------

class TestClientDisconnect:
    @pytest.mark.asyncio
    async def test_stops_after_disconnect(self):
        """After is_disconnected() returns True no more tokens are emitted."""
        # Disconnect after 2 tokens have been checked
        req = _make_request(disconnected_after=2)
        received = []

        async def _infinite():
            for i in range(100):
                yield f"token-{i}"

        async for event in sse_stream(_infinite(), req):
            received.append(event)

        # We should have received at most a small number of tokens
        # (exact count depends on scheduling, but < 100)
        assert len(received) < 100

    @pytest.mark.asyncio
    async def test_no_done_event_after_disconnect(self):
        """[DONE] is NOT sent when the client has disconnected."""
        req = _make_request(disconnected_after=1)

        async def _infinite():
            for i in range(100):
                yield f"tok-{i}"

        received = []
        async for event in sse_stream(_infinite(), req):
            received.append(event)

        assert "data: [DONE]\n\n" not in received

    @pytest.mark.asyncio
    async def test_upstream_generator_closed_on_disconnect(self):
        """aclose() must be called on the upstream generator after disconnect."""
        req = _make_request(disconnected_after=1)
        closed = {"value": False}

        async def _tracked_gen():
            try:
                for i in range(100):
                    yield f"tok-{i}"
            finally:
                closed["value"] = True

        async for _ in sse_stream(_tracked_gen(), req):
            pass

        assert closed["value"] is True


# ---------------------------------------------------------------------------
# Provider errors
# ---------------------------------------------------------------------------

class TestProviderErrors:
    @pytest.mark.asyncio
    async def test_ai_provider_error_emits_error_event(self):
        req = _make_request()

        async def _failing_gen():
            yield "before error"
            raise AIProviderError("watsonx timeout")
            yield  # unreachable

        result = await _collect(sse_stream(_failing_gen(), req))
        # Last event should be an [ERROR] event
        assert any("[ERROR]" in e for e in result)
        assert not any("[DONE]" in e for e in result)

    @pytest.mark.asyncio
    async def test_ai_timeout_error_emits_error_event(self):
        req = _make_request()

        async def _timeout_gen():
            raise AITimeoutError("request timed out")
            yield  # unreachable

        result = await _collect(sse_stream(_timeout_gen(), req))
        assert result[-1].startswith("data: [ERROR]")

    @pytest.mark.asyncio
    async def test_unexpected_exception_emits_error_event(self):
        req = _make_request()

        async def _crash_gen():
            yield "first token"
            raise RuntimeError("something exploded")
            yield  # unreachable

        result = await _collect(sse_stream(_crash_gen(), req))
        assert any("[ERROR]" in e for e in result)
        assert "data: first token\n\n" in result

    @pytest.mark.asyncio
    async def test_error_event_contains_message(self):
        req = _make_request()

        async def _gen():
            raise AIProviderError("rate limit exceeded")
            yield  # unreachable

        result = await _collect(sse_stream(_gen(), req))
        error_events = [e for e in result if "[ERROR]" in e]
        assert len(error_events) == 1
        assert "rate limit exceeded" in error_events[0]

    @pytest.mark.asyncio
    async def test_upstream_generator_closed_after_error(self):
        """aclose() must still be called when an error is raised."""
        req = _make_request()
        closed = {"value": False}

        async def _erroring_gen():
            try:
                raise AIProviderError("boom")
                yield  # unreachable
            finally:
                closed["value"] = True

        await _collect(sse_stream(_erroring_gen(), req))
        assert closed["value"] is True
