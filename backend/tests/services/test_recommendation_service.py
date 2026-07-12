"""
tests/services/test_recommendation_service.py
===============================================
Unit tests for RecommendationService.

All tests use:
- An in-memory SQLite session (via the shared conftest fixtures)
- A mocked AIProvider (never calls real IBM watsonx.ai)
- A real PromptBuilder (pure function, no mocking needed)

Test strategy
-------------
- Happy path: AI returns valid JSON → Trip status=COMPLETED, itinerary set
- AI provider failure → Trip status=FAILED, AIGenerationError raised
- AI returns invalid JSON → Trip status=FAILED, ItineraryParseError raised
- AI returns JSON wrapped in markdown fences → still parsed correctly
- analyze_preferences: merges request + profile fields correctly
- analyze_preferences: handles None profile gracefully
- Trip record is always created before the AI call (verifiable by checking
  status=PENDING cannot be tested post-hoc, but the Trip row existence is)
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.ai.base import AIProviderError
from app.models.trip import TripStatus
from app.schemas.journey import JourneyRequest
from app.services.recommendation_service import (
    AIGenerationError,
    ItineraryParseError,
    RecommendationService,
)
from app.services.prompt_builder import PromptBuilder


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

# Minimal valid itinerary JSON that satisfies _parse_itinerary
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
            "activities": ["Check in", "Explore Shinjuku"],
            "why": "Ease into the city",
        }
    ],
    "hidden_gems": [{"name": "Yanaka", "description": "Old Tokyo", "why": "Authentic"}],
    "food": [{"name": "Ichiran", "type": "Ramen", "description": "Solo booth ramen", "why": "Iconic"}],
    "shopping": [{"name": "Tokyu Hands", "category": "Crafts", "description": "Unique items", "why": "Local"}],
    "stay": [{"name": "Shinjuku area", "area": "Shinjuku", "description": "Central", "why": "Convenient"}],
    "culture": [{"tip": "Remove shoes indoors", "why": "Local custom"}],
    "travel_tips": ["Get a Suica card"],
    "estimated_budget": {
        "accommodation": "$60/night",
        "food": "$30/day",
        "transport": "$10/day",
        "activities": "$50 total",
        "total": "$400 for 3 days",
    },
    "why_this_plan": "Optimised for cultural immersion at a mid-range budget.",
}


def _make_ai_provider(response: str = "") -> MagicMock:
    """Return a mock AIProvider whose complete() returns the given string."""
    provider = MagicMock()
    provider.complete = AsyncMock(return_value=response)
    return provider


def _make_profile(**kwargs) -> MagicMock:
    """Return a mock TravelProfile with given attributes (defaults to None)."""
    defaults = {
        "id": "profile-uuid-1",
        "preferred_budget": None,
        "food_preference": None,
        "travel_style": None,
        "adventure_level": None,
        "luxury_preference": None,
        "interests": None,
        "travel_pace": None,
        "accessibility_requirements": None,
        "language_preference": None,
    }
    defaults.update(kwargs)
    profile = MagicMock()
    for k, v in defaults.items():
        setattr(profile, k, v)
    return profile


def _make_service(ai_response: str = "") -> RecommendationService:
    return RecommendationService(
        ai_provider=_make_ai_provider(ai_response),
        prompt_builder=PromptBuilder(),
    )


@pytest.fixture
def db(setup_test_db):
    """Yields a fresh SQLite session bound to the test schema."""
    from tests.conftest import TestingSessionLocal
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


# ---------------------------------------------------------------------------
# analyze_preferences tests
# ---------------------------------------------------------------------------

class TestAnalyzePreferences:
    def _svc(self) -> RecommendationService:
        return _make_service()

    def _request(self, destination="Paris", days=3, companions=None) -> JourneyRequest:
        return JourneyRequest(destination=destination, days=days, companions=companions)

    def test_returns_dict_with_request_fields(self):
        svc = self._svc()
        req = self._request(destination="Rome, Italy", days=5, companions="couple")
        prefs = svc.analyze_preferences(req, None)
        assert prefs["destination"] == "Rome, Italy"
        assert prefs["days"] == 5
        assert prefs["companions"] == "couple"

    def test_includes_all_nine_profile_fields(self):
        svc = self._svc()
        req = self._request()
        profile = _make_profile(
            preferred_budget="luxury",
            food_preference="vegan",
            travel_style="adventure",
            adventure_level="high",
            luxury_preference="5-star",
            interests=["hiking", "art"],
            travel_pace="fast",
            accessibility_requirements="none",
            language_preference="en",
        )
        prefs = svc.analyze_preferences(req, profile)
        assert prefs["preferred_budget"] == "luxury"
        assert prefs["food_preference"] == "vegan"
        assert prefs["travel_style"] == "adventure"
        assert prefs["adventure_level"] == "high"
        assert prefs["luxury_preference"] == "5-star"
        assert prefs["interests"] == ["hiking", "art"]
        assert prefs["travel_pace"] == "fast"
        assert prefs["accessibility_requirements"] == "none"
        assert prefs["language_preference"] == "en"

    def test_handles_none_profile(self):
        svc = self._svc()
        req = self._request()
        prefs = svc.analyze_preferences(req, None)
        # All profile fields should be None
        for field in [
            "preferred_budget", "food_preference", "travel_style",
            "adventure_level", "luxury_preference", "interests",
            "travel_pace", "accessibility_requirements", "language_preference",
        ]:
            assert prefs[field] is None, f"{field} should be None"


# ---------------------------------------------------------------------------
# generate_itinerary — happy path
# ---------------------------------------------------------------------------

class TestGenerateItinerarySuccess:
    @pytest.mark.asyncio
    async def test_returns_completed_trip(self, db):
        """Happy path: valid JSON → Trip status=COMPLETED, itinerary populated."""
        svc = _make_service(json.dumps(VALID_ITINERARY))
        req = JourneyRequest(destination="Tokyo, Japan", days=3)
        profile = _make_profile()

        # Need to insert a user row first (trips table has user_id FK)
        from app.services.auth_service import hash_password
        from sqlalchemy import text
        user_id = "test-user-uuid-001"
        db.execute(text(
            "INSERT INTO users (id, email, hashed_password) "
            "VALUES (:id, :email, :pw)"
        ), {"id": user_id, "email": "test@example.com", "pw": hash_password("pw")})
        db.commit()

        trip = await svc.generate_itinerary(
            request=req,
            travel_profile=profile,
            user_id=user_id,
            db=db,
        )

        assert trip.status == TripStatus.COMPLETED
        assert trip.itinerary is not None
        assert trip.itinerary["trip_summary"]["destination"] == "Tokyo, Japan"
        assert trip.destination == "Tokyo, Japan"
        assert trip.days == 3

    @pytest.mark.asyncio
    async def test_creates_trip_with_correct_user_id(self, db):
        from app.services.auth_service import hash_password
        from sqlalchemy import text
        user_id = "test-user-uuid-002"
        db.execute(text(
            "INSERT INTO users (id, email, hashed_password) "
            "VALUES (:id, :email, :pw)"
        ), {"id": user_id, "email": "test2@example.com", "pw": hash_password("pw")})
        db.commit()

        svc = _make_service(json.dumps(VALID_ITINERARY))
        req = JourneyRequest(destination="Kyoto", days=2)

        trip = await svc.generate_itinerary(
            request=req,
            travel_profile=None,
            user_id=user_id,
            db=db,
        )

        assert trip.user_id == user_id

    @pytest.mark.asyncio
    async def test_parses_json_wrapped_in_markdown_fences(self, db):
        """Model returns ```json ... ``` — should still be parsed."""
        fenced = f"```json\n{json.dumps(VALID_ITINERARY)}\n```"
        svc = _make_service(fenced)

        from app.services.auth_service import hash_password
        from sqlalchemy import text
        user_id = "test-user-uuid-003"
        db.execute(text(
            "INSERT INTO users (id, email, hashed_password) "
            "VALUES (:id, :email, :pw)"
        ), {"id": user_id, "email": "test3@example.com", "pw": hash_password("pw")})
        db.commit()

        trip = await svc.generate_itinerary(
            request=JourneyRequest(destination="Tokyo, Japan", days=3),
            travel_profile=None,
            user_id=user_id,
            db=db,
        )

        assert trip.status == TripStatus.COMPLETED
        assert isinstance(trip.itinerary, dict)

    @pytest.mark.asyncio
    async def test_trip_profile_id_snapshot(self, db):
        """travel_profile_id on the Trip row should match the profile's id."""
        from app.services.auth_service import hash_password
        from sqlalchemy import text
        user_id = "test-user-uuid-004"
        db.execute(text(
            "INSERT INTO users (id, email, hashed_password) "
            "VALUES (:id, :email, :pw)"
        ), {"id": user_id, "email": "test4@example.com", "pw": hash_password("pw")})
        db.commit()

        profile = _make_profile(id="profile-snapshot-id")
        svc = _make_service(json.dumps(VALID_ITINERARY))

        trip = await svc.generate_itinerary(
            request=JourneyRequest(destination="Bangkok", days=4),
            travel_profile=profile,
            user_id=user_id,
            db=db,
        )

        assert trip.travel_profile_id == "profile-snapshot-id"


# ---------------------------------------------------------------------------
# generate_itinerary — failure paths
# ---------------------------------------------------------------------------

class TestGenerateItineraryFailures:
    async def _setup_user(self, db, user_id: str, email: str) -> None:
        from app.services.auth_service import hash_password
        from sqlalchemy import text
        db.execute(text(
            "INSERT INTO users (id, email, hashed_password) "
            "VALUES (:id, :email, :pw)"
        ), {"id": user_id, "email": email, "pw": hash_password("pw")})
        db.commit()

    @pytest.mark.asyncio
    async def test_ai_provider_error_raises_ai_generation_error(self, db):
        """AIProviderError from the AI layer → AIGenerationError raised."""
        await self._setup_user(db, "fail-user-001", "fail1@example.com")

        provider = MagicMock()
        provider.complete = AsyncMock(side_effect=AIProviderError("timeout"))
        svc = RecommendationService(
            ai_provider=provider, prompt_builder=PromptBuilder()
        )

        with pytest.raises(AIGenerationError):
            await svc.generate_itinerary(
                request=JourneyRequest(destination="London", days=2),
                travel_profile=None,
                user_id="fail-user-001",
                db=db,
            )

    @pytest.mark.asyncio
    async def test_ai_provider_error_sets_trip_to_failed(self, db):
        """Trip status must be FAILED after an AI error."""
        await self._setup_user(db, "fail-user-002", "fail2@example.com")

        provider = MagicMock()
        provider.complete = AsyncMock(side_effect=AIProviderError("boom"))
        svc = RecommendationService(
            ai_provider=provider, prompt_builder=PromptBuilder()
        )

        try:
            await svc.generate_itinerary(
                request=JourneyRequest(destination="Berlin", days=3),
                travel_profile=None,
                user_id="fail-user-002",
                db=db,
            )
        except AIGenerationError:
            pass

        from app.models.trip import Trip
        trip = db.query(Trip).filter(Trip.user_id == "fail-user-002").first()
        assert trip is not None
        assert trip.status == TripStatus.FAILED

    @pytest.mark.asyncio
    async def test_invalid_json_response_raises_itinerary_parse_error(self, db):
        """AI returns non-JSON text → ItineraryParseError raised."""
        await self._setup_user(db, "fail-user-003", "fail3@example.com")

        svc = _make_service("This is not JSON at all, sorry!")

        with pytest.raises(ItineraryParseError):
            await svc.generate_itinerary(
                request=JourneyRequest(destination="Madrid", days=2),
                travel_profile=None,
                user_id="fail-user-003",
                db=db,
            )

    @pytest.mark.asyncio
    async def test_invalid_json_sets_trip_to_failed(self, db):
        """Trip must be FAILED when the AI response is not valid JSON."""
        await self._setup_user(db, "fail-user-004", "fail4@example.com")

        svc = _make_service("not json")

        try:
            await svc.generate_itinerary(
                request=JourneyRequest(destination="Rome", days=3),
                travel_profile=None,
                user_id="fail-user-004",
                db=db,
            )
        except ItineraryParseError:
            pass

        from app.models.trip import Trip
        trip = db.query(Trip).filter(Trip.user_id == "fail-user-004").first()
        assert trip is not None
        assert trip.status == TripStatus.FAILED


# ---------------------------------------------------------------------------
# _parse_itinerary — internal helper unit tests
# ---------------------------------------------------------------------------

class TestParseItinerary:
    def _svc(self) -> RecommendationService:
        return _make_service()

    def test_parses_clean_json(self):
        svc = self._svc()
        result = svc._parse_itinerary(json.dumps(VALID_ITINERARY), "trip-001")
        assert isinstance(result, dict)
        assert "trip_summary" in result

    def test_parses_json_with_leading_trailing_whitespace(self):
        svc = self._svc()
        raw = f"  \n  {json.dumps(VALID_ITINERARY)}  \n  "
        result = svc._parse_itinerary(raw, "trip-002")
        assert isinstance(result, dict)

    def test_parses_json_in_backtick_fences(self):
        svc = self._svc()
        raw = f"```json\n{json.dumps(VALID_ITINERARY)}\n```"
        result = svc._parse_itinerary(raw, "trip-003")
        assert isinstance(result, dict)

    def test_parses_json_in_plain_fences(self):
        svc = self._svc()
        raw = f"```\n{json.dumps(VALID_ITINERARY)}\n```"
        result = svc._parse_itinerary(raw, "trip-004")
        assert isinstance(result, dict)

    def test_raises_on_no_json_object(self):
        svc = self._svc()
        with pytest.raises(ItineraryParseError):
            svc._parse_itinerary("Hello there!", "trip-005")

    def test_raises_on_broken_json(self):
        svc = self._svc()
        with pytest.raises(ItineraryParseError):
            svc._parse_itinerary("{broken: json, missing quotes}", "trip-006")

    def test_raises_on_empty_string(self):
        svc = self._svc()
        with pytest.raises(ItineraryParseError):
            svc._parse_itinerary("", "trip-007")
