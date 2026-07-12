"""
tests/routers/test_journeys.py
================================
Endpoint-level tests for the Journey Planner API.

Strategy
--------
- Uses Starlette TestClient (sync, no running server).
- Database is provided by tests/conftest.py (SQLite in-memory, reset per test).
- RecommendationService.generate_itinerary is mocked to avoid any AI calls.
- A real registered + logged-in user is used for auth tests.
- All three endpoints are covered: POST /journeys, GET /journeys, GET /journeys/{id}

Mock approach
-------------
The dependency get_recommendation_service is overridden at the FastAPI app
level (just like get_db in conftest.py). The mock service's generate_itinerary
returns a real Trip row that was pre-inserted into the SQLite test DB so that
the response serialisation path is fully exercised.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from starlette.testclient import TestClient

from app.main import app
from app.models.trip import TripStatus


# ---------------------------------------------------------------------------
# Test data
# ---------------------------------------------------------------------------

VALID_USER = {"email": "journey_tester@example.com", "password": "SecurePass123!"}

VALID_ITINERARY = {
    "trip_summary": {
        "destination": "Tokyo, Japan",
        "duration_days": 3,
        "travel_style": "cultural",
        "budget_tier": "mid-range",
    },
    "daywise_itinerary": [
        {
            "day": 1,
            "theme": "Arrival",
            "activities": ["Explore Shinjuku"],
            "why": "Central hub",
        }
    ],
    "hidden_gems": [{"name": "Yanaka", "description": "Old Tokyo", "why": "Authentic"}],
    "food": [{"name": "Ichiran", "type": "Ramen", "description": "Solo booths", "why": "Iconic"}],
    "shopping": [{"name": "Tokyu Hands", "category": "Crafts", "description": "Unique", "why": "Local"}],
    "stay": [{"name": "Shinjuku", "area": "Shinjuku", "description": "Central", "why": "Convenient"}],
    "culture": [{"tip": "Remove shoes indoors", "why": "Custom"}],
    "travel_tips": ["Get a Suica card"],
    "estimated_budget": {
        "accommodation": "$60/night",
        "food": "$30/day",
        "transport": "$10/day",
        "activities": "$50 total",
        "total": "$400 for 3 days",
    },
    "why_this_plan": "Optimised for cultural immersion.",
}


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    """Returns a TestClient. DB override active via conftest."""
    return TestClient(app, raise_server_exceptions=True)


@pytest.fixture
def auth_headers(client) -> dict[str, str]:
    """Registers a user and returns valid Authorization headers."""
    client.post("/auth/register", json=VALID_USER)
    res = client.post(
        "/auth/login",
        data={"username": VALID_USER["email"], "password": VALID_USER["password"]},
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _get_user_id(client, auth_headers) -> str:
    """Return the authenticated user's ID."""
    res = client.get("/users/me", headers=auth_headers)
    return res.json()["id"]


# ---------------------------------------------------------------------------
# Helper — build a real Trip ORM instance (stored in test DB)
# ---------------------------------------------------------------------------

def _make_trip_in_db(db_session, user_id: str, **overrides):
    """
    Inserts a Trip row directly via SQLAlchemy raw SQL and returns the trip_id.
    Used to pre-populate the DB so list/detail endpoints have data to return.

    Status must be stored as the UPPERCASE enum value so SQLAlchemy's Enum
    type processor can map it back to TripStatus (e.g. 'COMPLETED' not 'completed').
    Accepts either lowercase or uppercase — normalises to uppercase internally.
    """
    from sqlalchemy import text
    trip_id = str(uuid.uuid4())
    destination = overrides.get("destination", "Tokyo, Japan")
    days = overrides.get("days", 3)
    companions = overrides.get("companions", None)
    # Normalise to uppercase — TripStatus stores values as 'PENDING', 'COMPLETED', 'FAILED'
    raw_status = overrides.get("status", "completed")
    status = raw_status.upper()
    itinerary_data = overrides.get("itinerary", VALID_ITINERARY)
    itin_str = json.dumps(itinerary_data) if itinerary_data is not None else None

    db_session.execute(text(
        "INSERT INTO trips (id, user_id, destination, days, companions, itinerary, status) "
        "VALUES (:id, :uid, :dest, :days, :comp, :itin, :status)"
    ), {
        "id": trip_id,
        "uid": user_id,
        "dest": destination,
        "days": days,
        "comp": companions,
        "itin": itin_str,
        "status": status,
    })
    db_session.commit()
    return trip_id


# ---------------------------------------------------------------------------
# POST /journeys tests
# ---------------------------------------------------------------------------

class TestCreateJourney:
    def _valid_payload(self, destination="Tokyo, Japan", days=3, companions=None):
        p = {"destination": destination, "days": days}
        if companions:
            p["companions"] = companions
        return p

    def test_requires_authentication(self, client):
        """No token → 401."""
        res = client.post("/journeys", json=self._valid_payload())
        assert res.status_code == 401

    def test_invalid_request_too_many_days(self, client, auth_headers):
        """days > 30 → 422 validation error."""
        res = client.post(
            "/journeys",
            json={"destination": "Tokyo", "days": 31},
            headers=auth_headers,
        )
        assert res.status_code == 422

    def test_invalid_request_zero_days(self, client, auth_headers):
        """days = 0 → 422 validation error."""
        res = client.post(
            "/journeys",
            json={"destination": "Tokyo", "days": 0},
            headers=auth_headers,
        )
        assert res.status_code == 422

    def test_invalid_request_missing_destination(self, client, auth_headers):
        """Missing destination → 422."""
        res = client.post(
            "/journeys",
            json={"days": 3},
            headers=auth_headers,
        )
        assert res.status_code == 422

    def test_invalid_request_empty_destination(self, client, auth_headers):
        """Empty string destination → 422."""
        res = client.post(
            "/journeys",
            json={"destination": "", "days": 3},
            headers=auth_headers,
        )
        assert res.status_code == 422

    def test_success_returns_201_with_itinerary(self, client, auth_headers):
        """Happy path: mocked service returns COMPLETED trip → 201 + body."""
        from app.dependencies.recommendation import get_recommendation_service
        from tests.conftest import TestingSessionLocal

        # Build a mock service that inserts a real Trip into the test DB
        # We need the user_id, so we fetch it first
        user_id = _get_user_id(client, auth_headers)
        db = TestingSessionLocal()

        try:
            trip_id = _make_trip_in_db(
                db,
                user_id,
                destination="Tokyo, Japan",
                days=3,
                status="completed",
                itinerary=VALID_ITINERARY,
            )

            # Build a Trip-like object for the mock to return
            from app.models.trip import Trip
            mock_trip = db.query(Trip).filter(Trip.id == trip_id).first()

            mock_svc = MagicMock()
            mock_svc.generate_itinerary = AsyncMock(return_value=mock_trip)

            app.dependency_overrides[get_recommendation_service] = lambda: mock_svc

            res = client.post(
                "/journeys",
                json={"destination": "Tokyo, Japan", "days": 3},
                headers=auth_headers,
            )
        finally:
            db.close()
            # Remove the override after the request (keep db override)
            app.dependency_overrides.pop(get_recommendation_service, None)

        assert res.status_code == 201, res.text
        body = res.json()
        assert "trip_id" in body
        assert body["status"] == "completed"
        assert body["itinerary"] is not None
        assert body["destination"] == "Tokyo, Japan"
        assert body["days"] == 3

    def test_ai_generation_error_returns_503(self, client, auth_headers):
        """AIGenerationError from service → 503."""
        from app.dependencies.recommendation import get_recommendation_service
        from app.services.recommendation_service import AIGenerationError

        mock_svc = MagicMock()
        mock_svc.generate_itinerary = AsyncMock(
            side_effect=AIGenerationError("AI provider down")
        )
        app.dependency_overrides[get_recommendation_service] = lambda: mock_svc

        try:
            res = client.post(
                "/journeys",
                json={"destination": "Tokyo", "days": 3},
                headers=auth_headers,
            )
        finally:
            app.dependency_overrides.pop(get_recommendation_service, None)

        assert res.status_code == 503

    def test_itinerary_parse_error_returns_502(self, client, auth_headers):
        """ItineraryParseError from service → 502."""
        from app.dependencies.recommendation import get_recommendation_service
        from app.services.recommendation_service import ItineraryParseError

        mock_svc = MagicMock()
        mock_svc.generate_itinerary = AsyncMock(
            side_effect=ItineraryParseError("bad JSON")
        )
        app.dependency_overrides[get_recommendation_service] = lambda: mock_svc

        try:
            res = client.post(
                "/journeys",
                json={"destination": "Tokyo", "days": 3},
                headers=auth_headers,
            )
        finally:
            app.dependency_overrides.pop(get_recommendation_service, None)

        assert res.status_code == 502

    def test_response_never_exposes_user_id_or_hashed_password(self, client, auth_headers):
        """Sanity: response body should not contain any sensitive auth fields."""
        from app.dependencies.recommendation import get_recommendation_service
        from tests.conftest import TestingSessionLocal

        user_id = _get_user_id(client, auth_headers)
        db = TestingSessionLocal()
        try:
            trip_id = _make_trip_in_db(db, user_id, status="completed")
            from app.models.trip import Trip
            mock_trip = db.query(Trip).filter(Trip.id == trip_id).first()
            mock_svc = MagicMock()
            mock_svc.generate_itinerary = AsyncMock(return_value=mock_trip)
            app.dependency_overrides[get_recommendation_service] = lambda: mock_svc

            res = client.post(
                "/journeys",
                json={"destination": "Tokyo, Japan", "days": 3},
                headers=auth_headers,
            )
        finally:
            db.close()
            app.dependency_overrides.pop(get_recommendation_service, None)

        body_str = res.text
        assert "hashed_password" not in body_str
        assert "user_id" not in body_str


# ---------------------------------------------------------------------------
# GET /journeys tests
# ---------------------------------------------------------------------------

class TestListJourneys:
    def test_requires_authentication(self, client):
        res = client.get("/journeys")
        assert res.status_code == 401

    def test_returns_empty_list_for_new_user(self, client, auth_headers):
        """Brand-new user has no trips → empty list."""
        res = client.get("/journeys", headers=auth_headers)
        assert res.status_code == 200
        assert res.json() == []

    def test_returns_user_trips(self, client, auth_headers):
        """User with trips sees them in the list."""
        from tests.conftest import TestingSessionLocal
        user_id = _get_user_id(client, auth_headers)
        db = TestingSessionLocal()
        try:
            _make_trip_in_db(db, user_id, destination="Paris, France")
            _make_trip_in_db(db, user_id, destination="Rome, Italy")
        finally:
            db.close()

        res = client.get("/journeys", headers=auth_headers)
        assert res.status_code == 200
        destinations = [t["destination"] for t in res.json()]
        assert "Paris, France" in destinations
        assert "Rome, Italy" in destinations

    def test_does_not_return_other_users_trips(self, client, auth_headers):
        """User A cannot see User B's trips."""
        from tests.conftest import TestingSessionLocal
        from sqlalchemy import text

        db = TestingSessionLocal()
        try:
            # Create a second user and their trip
            from app.services.auth_service import hash_password
            other_user_id = str(uuid.uuid4())
            db.execute(text(
                "INSERT INTO users (id, email, hashed_password) "
                "VALUES (:id, :email, :pw)"
            ), {"id": other_user_id, "email": "other@example.com", "pw": hash_password("pw")})
            db.commit()
            _make_trip_in_db(db, other_user_id, destination="Secret Destination")
        finally:
            db.close()

        res = client.get("/journeys", headers=auth_headers)
        assert res.status_code == 200
        destinations = [t["destination"] for t in res.json()]
        assert "Secret Destination" not in destinations

    def test_response_contains_summary_fields(self, client, auth_headers):
        """Each item has the expected summary fields."""
        from tests.conftest import TestingSessionLocal
        user_id = _get_user_id(client, auth_headers)
        db = TestingSessionLocal()
        try:
            _make_trip_in_db(db, user_id, destination="Barcelona")
        finally:
            db.close()

        res = client.get("/journeys", headers=auth_headers)
        assert res.status_code == 200
        item = res.json()[0]
        assert "trip_id" in item
        assert "destination" in item
        assert "days" in item
        assert "status" in item
        assert "created_at" in item
        # itinerary must NOT be in summary
        assert "itinerary" not in item

    def test_pagination_limit(self, client, auth_headers):
        """limit query param restricts the number of results."""
        from tests.conftest import TestingSessionLocal
        user_id = _get_user_id(client, auth_headers)
        db = TestingSessionLocal()
        try:
            for i in range(5):
                _make_trip_in_db(db, user_id, destination=f"City {i}")
        finally:
            db.close()

        res = client.get("/journeys?limit=2", headers=auth_headers)
        assert res.status_code == 200
        assert len(res.json()) == 2

    def test_pagination_offset(self, client, auth_headers):
        """offset skips results."""
        from tests.conftest import TestingSessionLocal
        user_id = _get_user_id(client, auth_headers)
        db = TestingSessionLocal()
        try:
            for i in range(4):
                _make_trip_in_db(db, user_id, destination=f"City {i}")
        finally:
            db.close()

        all_res = client.get("/journeys?limit=10", headers=auth_headers)
        page2_res = client.get("/journeys?limit=10&offset=2", headers=auth_headers)
        all_ids = [t["trip_id"] for t in all_res.json()]
        page2_ids = [t["trip_id"] for t in page2_res.json()]
        # Page 2 should have 2 items (4 total, skip 2)
        assert len(page2_ids) == 2
        # The items in page 2 should be from the full list
        for pid in page2_ids:
            assert pid in all_ids


# ---------------------------------------------------------------------------
# GET /journeys/{trip_id} tests
# ---------------------------------------------------------------------------

class TestGetJourney:
    def test_requires_authentication(self, client):
        res = client.get("/journeys/some-trip-id")
        assert res.status_code == 401

    def test_returns_full_trip_with_itinerary(self, client, auth_headers):
        """Owned trip → 200 + full itinerary body."""
        from tests.conftest import TestingSessionLocal
        user_id = _get_user_id(client, auth_headers)
        db = TestingSessionLocal()
        try:
            trip_id = _make_trip_in_db(
                db, user_id, destination="Tokyo, Japan", status="completed"
            )
        finally:
            db.close()

        res = client.get(f"/journeys/{trip_id}", headers=auth_headers)
        assert res.status_code == 200, res.text
        body = res.json()
        assert body["trip_id"] == trip_id
        assert body["destination"] == "Tokyo, Japan"
        assert body["status"] == "completed"
        assert body["itinerary"] is not None

    def test_returns_404_for_nonexistent_trip(self, client, auth_headers):
        """Random UUID → 404."""
        res = client.get(f"/journeys/{uuid.uuid4()}", headers=auth_headers)
        assert res.status_code == 404

    def test_returns_404_for_another_users_trip(self, client, auth_headers):
        """Trip belonging to another user → 404 (ownership enforced)."""
        from tests.conftest import TestingSessionLocal
        from sqlalchemy import text

        db = TestingSessionLocal()
        try:
            from app.services.auth_service import hash_password
            other_id = str(uuid.uuid4())
            db.execute(text(
                "INSERT INTO users (id, email, hashed_password) "
                "VALUES (:id, :email, :pw)"
            ), {"id": other_id, "email": "stranger@example.com", "pw": hash_password("pw")})
            db.commit()
            other_trip_id = _make_trip_in_db(
                db, other_id, destination="Private City"
            )
        finally:
            db.close()

        res = client.get(f"/journeys/{other_trip_id}", headers=auth_headers)
        assert res.status_code == 404

    def test_response_includes_all_journey_response_fields(self, client, auth_headers):
        """Response body has all JourneyResponse fields."""
        from tests.conftest import TestingSessionLocal
        user_id = _get_user_id(client, auth_headers)
        db = TestingSessionLocal()
        try:
            trip_id = _make_trip_in_db(
                db, user_id, destination="Paris", companions="couple"
            )
        finally:
            db.close()

        res = client.get(f"/journeys/{trip_id}", headers=auth_headers)
        assert res.status_code == 200
        body = res.json()
        for field in ["trip_id", "destination", "days", "companions", "status", "created_at", "itinerary"]:
            assert field in body, f"Missing field: {field}"

    def test_pending_trip_returns_null_itinerary(self, client, auth_headers):
        """A PENDING trip has itinerary=null."""
        from tests.conftest import TestingSessionLocal
        user_id = _get_user_id(client, auth_headers)
        db = TestingSessionLocal()
        try:
            trip_id = _make_trip_in_db(
                db, user_id, destination="In Progress City", status="pending", itinerary=None
            )
        finally:
            db.close()

        res = client.get(f"/journeys/{trip_id}", headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["status"] == "pending"
        assert res.json()["itinerary"] is None
