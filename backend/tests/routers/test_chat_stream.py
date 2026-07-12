"""
tests/routers/test_chat_stream.py
===================================
Endpoint-level tests for POST /chat/stream.

Strategy
--------
- Uses Starlette's TestClient with ``stream=True`` so we can read the
  SSE response body without it being buffered into one chunk.
- The AIProvider is overridden at the app level so zero real IBM calls
  are made.
- A real registered + logged-in user supplies the JWT.

Coverage
--------
- Unauthenticated request → 401
- Valid request without profile → stream starts with tokens + [DONE]
- Valid request with use_profile=true → profile loaded and stream works
- Provider error → [ERROR] event in stream (200 status preserved)
- Empty message → 422 validation error
- Message too long → 422 validation error
- Content-Type is text/event-stream
"""

from __future__ import annotations

import pytest
from starlette.testclient import TestClient

from app.main import app


VALID_USER = {"email": "chat_stream_tester@example.com", "password": "SecurePass123!"}


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    return TestClient(app, raise_server_exceptions=True)


@pytest.fixture
def auth_headers(client) -> dict[str, str]:
    client.post("/auth/register", json=VALID_USER)
    res = client.post(
        "/auth/login",
        data={"username": VALID_USER["email"], "password": VALID_USER["password"]},
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _mock_stream_provider(tokens: list[str]):
    """Return an AIProvider mock whose stream_completion yields given tokens."""
    from unittest.mock import AsyncMock, MagicMock
    from app.ai.factory import get_ai_provider

    async def _gen(_prompt: str):
        for t in tokens:
            yield t

    provider = MagicMock()
    provider.stream_completion = _gen
    return provider


def _collect_sse_body(response) -> str:
    """Read the full streaming body as a single string."""
    chunks = []
    for chunk in response.iter_bytes():
        chunks.append(chunk.decode("utf-8", errors="replace"))
    return "".join(chunks)


# ---------------------------------------------------------------------------
# Authentication tests
# ---------------------------------------------------------------------------

class TestChatStreamAuth:
    def test_no_token_returns_401(self, client):
        res = client.post("/chat/stream", json={"message": "Hello"})
        assert res.status_code == 401

    def test_invalid_token_returns_401(self, client):
        res = client.post(
            "/chat/stream",
            json={"message": "Hello"},
            headers={"Authorization": "Bearer garbage.token.here"},
        )
        assert res.status_code == 401


# ---------------------------------------------------------------------------
# Validation tests
# ---------------------------------------------------------------------------

class TestChatStreamValidation:
    def test_empty_message_returns_422(self, client, auth_headers):
        res = client.post(
            "/chat/stream",
            json={"message": ""},
            headers=auth_headers,
        )
        assert res.status_code == 422

    def test_message_too_long_returns_422(self, client, auth_headers):
        res = client.post(
            "/chat/stream",
            json={"message": "x" * 2001},
            headers=auth_headers,
        )
        assert res.status_code == 422

    def test_missing_message_returns_422(self, client, auth_headers):
        res = client.post(
            "/chat/stream",
            json={},
            headers=auth_headers,
        )
        assert res.status_code == 422


# ---------------------------------------------------------------------------
# Streaming content tests
# ---------------------------------------------------------------------------

class TestChatStreamContent:
    def test_returns_200_with_event_stream_content_type(self, client, auth_headers):
        from app.ai.factory import get_ai_provider

        provider = _mock_stream_provider(["Hello", "!"])
        app.dependency_overrides[get_ai_provider] = lambda: provider

        try:
            with client.stream(
                "POST",
                "/chat/stream",
                json={"message": "Best time to visit Tokyo?"},
                headers=auth_headers,
            ) as res:
                assert res.status_code == 200
                assert "text/event-stream" in res.headers["content-type"]
        finally:
            app.dependency_overrides.pop(get_ai_provider, None)

    def test_tokens_are_framed_as_sse_events(self, client, auth_headers):
        from app.ai.factory import get_ai_provider

        provider = _mock_stream_provider(["Tokyo", " is", " amazing"])
        app.dependency_overrides[get_ai_provider] = lambda: provider

        try:
            with client.stream(
                "POST",
                "/chat/stream",
                json={"message": "Tell me about Tokyo."},
                headers=auth_headers,
            ) as res:
                body = _collect_sse_body(res)
        finally:
            app.dependency_overrides.pop(get_ai_provider, None)

        assert "data: Tokyo\n\n" in body
        assert "data:  is\n\n" in body
        assert "data:  amazing\n\n" in body

    def test_stream_ends_with_done_event(self, client, auth_headers):
        from app.ai.factory import get_ai_provider

        provider = _mock_stream_provider(["one", "two"])
        app.dependency_overrides[get_ai_provider] = lambda: provider

        try:
            with client.stream(
                "POST",
                "/chat/stream",
                json={"message": "Any tips for Paris?"},
                headers=auth_headers,
            ) as res:
                body = _collect_sse_body(res)
        finally:
            app.dependency_overrides.pop(get_ai_provider, None)

        assert "data: [DONE]\n\n" in body

    def test_provider_error_emits_error_event(self, client, auth_headers):
        from app.ai.factory import get_ai_provider
        from app.ai.base import AIProviderError
        from unittest.mock import MagicMock

        async def _err_gen(_prompt):
            raise AIProviderError("connection refused")
            yield  # unreachable

        provider = MagicMock()
        provider.stream_completion = _err_gen
        app.dependency_overrides[get_ai_provider] = lambda: provider

        try:
            with client.stream(
                "POST",
                "/chat/stream",
                json={"message": "Hello"},
                headers=auth_headers,
            ) as res:
                body = _collect_sse_body(res)
        finally:
            app.dependency_overrides.pop(get_ai_provider, None)

        assert "[ERROR]" in body
        assert "[DONE]" not in body

    def test_use_profile_false_does_not_query_travel_profile(
        self, client, auth_headers
    ):
        """use_profile=False → stream succeeds without needing a travel profile."""
        from app.ai.factory import get_ai_provider

        provider = _mock_stream_provider(["hi"])
        app.dependency_overrides[get_ai_provider] = lambda: provider

        try:
            with client.stream(
                "POST",
                "/chat/stream",
                json={"message": "Hello?", "use_profile": False},
                headers=auth_headers,
            ) as res:
                body = _collect_sse_body(res)
        finally:
            app.dependency_overrides.pop(get_ai_provider, None)

        assert "data: hi\n\n" in body
        assert "data: [DONE]\n\n" in body

    def test_use_profile_true_still_streams_successfully(self, client, auth_headers):
        """use_profile=True with empty profile → stream still works."""
        from app.ai.factory import get_ai_provider

        provider = _mock_stream_provider(["personalised", " response"])
        app.dependency_overrides[get_ai_provider] = lambda: provider

        try:
            with client.stream(
                "POST",
                "/chat/stream",
                json={"message": "What food should I try?", "use_profile": True},
                headers=auth_headers,
            ) as res:
                body = _collect_sse_body(res)
        finally:
            app.dependency_overrides.pop(get_ai_provider, None)

        assert "data: [DONE]\n\n" in body
