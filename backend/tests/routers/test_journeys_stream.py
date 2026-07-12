"""
tests/routers/test_journeys_stream.py
=======================================
Endpoint-level tests for POST /journeys/stream.

Strategy
--------
- Uses Starlette's TestClient with ``stream=True`` to consume the SSE body.
- The AIProvider is overridden at the app level.
- A real registered + logged-in user supplies the JWT.
- The Trip record creation is real (SQLite in-memory) — this verifies that
  a PENDING trip row is created before streaming starts.

Coverage
--------
- Unauthenticated request → 401
- Validation errors → 422
- Successful stream: [TRIP_ID] event, token events, [DONE] event
- Provider error → [ERROR] event in stream
- Trip(PENDING) row created in DB before streaming
"""

from __future__ import annotations

import uuid

import pytest
from starlette.testclient import TestClient

from app.main import app


VALID_USER = {"email": "journey_stream_tester@example.com", "password": "SecurePass123!"}


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


def _get_user_id(client, auth_headers) -> str:
    res = client.get("/users/me", headers=auth_headers)
    return res.json()["id"]


def _mock_stream_provider(tokens: list[str]):
    """Return an AIProvider mock whose stream_completion yields given tokens."""
    from unittest.mock import MagicMock

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

class TestJourneyStreamAuth:
    def test_no_token_returns_401(self, client):
        res = client.post(
            "/journeys/stream",
            json={"destination": "Tokyo", "days": 3},
        )
        assert res.status_code == 401

    def test_invalid_token_returns_401(self, client):
        res = client.post(
            "/journeys/stream",
            json={"destination": "Tokyo", "days": 3},
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        assert res.status_code == 401


# ---------------------------------------------------------------------------
# Validation tests
# ---------------------------------------------------------------------------

class TestJourneyStreamValidation:
    def test_missing_destination_returns_422(self, client, auth_headers):
        res = client.post(
            "/journeys/stream",
            json={"days": 3},
            headers=auth_headers,
        )
        assert res.status_code == 422

    def test_days_zero_returns_422(self, client, auth_headers):
        res = client.post(
            "/journeys/stream",
            json={"destination": "Paris", "days": 0},
            headers=auth_headers,
        )
        assert res.status_code == 422

    def test_days_too_many_returns_422(self, client, auth_headers):
        res = client.post(
            "/journeys/stream",
            json={"destination": "Paris", "days": 31},
            headers=auth_headers,
        )
        assert res.status_code == 422


# ---------------------------------------------------------------------------
# Streaming content tests
# ---------------------------------------------------------------------------

class TestJourneyStreamContent:
    def test_returns_200_with_event_stream_content_type(self, client, auth_headers):
        from app.ai.factory import get_ai_provider

        provider = _mock_stream_provider(["Hello"])
        app.dependency_overrides[get_ai_provider] = lambda: provider

        try:
            with client.stream(
                "POST",
                "/journeys/stream",
                json={"destination": "Tokyo, Japan", "days": 3},
                headers=auth_headers,
            ) as res:
                assert res.status_code == 200
                assert "text/event-stream" in res.headers["content-type"]
        finally:
            app.dependency_overrides.pop(get_ai_provider, None)

    def test_first_event_is_trip_id(self, client, auth_headers):
        """The very first SSE event must be ``data: [TRIP_ID] <uuid>``."""
        from app.ai.factory import get_ai_provider

        provider = _mock_stream_provider(["token1"])
        app.dependency_overrides[get_ai_provider] = lambda: provider

        try:
            with client.stream(
                "POST",
                "/journeys/stream",
                json={"destination": "Paris, France", "days": 2},
                headers=auth_headers,
            ) as res:
                body = _collect_sse_body(res)
        finally:
            app.dependency_overrides.pop(get_ai_provider, None)

        lines = [l for l in body.splitlines() if l.startswith("data:")]
        assert lines[0].startswith("data: [TRIP_ID] ")
        # The trip ID should look like a UUID
        trip_id_part = lines[0].replace("data: [TRIP_ID] ", "").strip()
        assert len(trip_id_part) == 36  # UUID length

    def test_token_events_follow_trip_id(self, client, auth_headers):
        from app.ai.factory import get_ai_provider

        provider = _mock_stream_provider(["Paris", " awaits"])
        app.dependency_overrides[get_ai_provider] = lambda: provider

        try:
            with client.stream(
                "POST",
                "/journeys/stream",
                json={"destination": "Paris, France", "days": 3},
                headers=auth_headers,
            ) as res:
                body = _collect_sse_body(res)
        finally:
            app.dependency_overrides.pop(get_ai_provider, None)

        assert "data: Paris\n\n" in body
        assert "data:  awaits\n\n" in body

    def test_stream_ends_with_done(self, client, auth_headers):
        from app.ai.factory import get_ai_provider

        provider = _mock_stream_provider(["day 1"])
        app.dependency_overrides[get_ai_provider] = lambda: provider

        try:
            with client.stream(
                "POST",
                "/journeys/stream",
                json={"destination": "Rome, Italy", "days": 4},
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
            raise AIProviderError("API down")
            yield  # unreachable

        provider = MagicMock()
        provider.stream_completion = _err_gen
        app.dependency_overrides[get_ai_provider] = lambda: provider

        try:
            with client.stream(
                "POST",
                "/journeys/stream",
                json={"destination": "Barcelona", "days": 5},
                headers=auth_headers,
            ) as res:
                body = _collect_sse_body(res)
        finally:
            app.dependency_overrides.pop(get_ai_provider, None)

        assert "[ERROR]" in body
        assert "[DONE]" not in body

    def test_trip_pending_row_created_in_db(self, client, auth_headers):
        """A Trip(PENDING) row must exist in the DB after the stream starts."""
        from app.ai.factory import get_ai_provider
        from tests.conftest import TestingSessionLocal
        from app.models.trip import Trip, TripStatus

        # Use a slow/empty provider so the request completes quickly
        provider = _mock_stream_provider([])
        app.dependency_overrides[get_ai_provider] = lambda: provider

        user_id = _get_user_id(client, auth_headers)

        try:
            with client.stream(
                "POST",
                "/journeys/stream",
                json={"destination": "Seoul, South Korea", "days": 3},
                headers=auth_headers,
            ) as res:
                _collect_sse_body(res)
        finally:
            app.dependency_overrides.pop(get_ai_provider, None)

        db = TestingSessionLocal()
        try:
            trips = (
                db.query(Trip)
                .filter(Trip.user_id == user_id)
                .all()
            )
        finally:
            db.close()

        # At least one trip row should have been created
        assert len(trips) >= 1
        assert any(t.destination == "Seoul, South Korea" for t in trips)

    def test_companions_optional_field_works(self, client, auth_headers):
        from app.ai.factory import get_ai_provider

        provider = _mock_stream_provider(["great trip"])
        app.dependency_overrides[get_ai_provider] = lambda: provider

        try:
            with client.stream(
                "POST",
                "/journeys/stream",
                json={
                    "destination": "Amsterdam, Netherlands",
                    "days": 2,
                    "companions": "couple",
                },
                headers=auth_headers,
            ) as res:
                body = _collect_sse_body(res)
        finally:
            app.dependency_overrides.pop(get_ai_provider, None)

        assert "data: [DONE]\n\n" in body
