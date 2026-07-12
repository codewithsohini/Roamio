"""
tests/services/test_prompt_builder.py
=======================================
Unit tests for PromptBuilder.

PromptBuilder is a thin orchestrator, so tests focus on:
  1. Correct delegation to the underlying prompt functions.
  2. Correct extraction and passing of TravelProfile fields.
  3. Graceful handling of None (no profile).

No database, no AI calls, no HTTP — fully synchronous pure-function tests.
"""

from unittest.mock import MagicMock

import pytest

from app.services.prompt_builder import PromptBuilder


# ---------------------------------------------------------------------------
# Helpers — lightweight mock profile
# ---------------------------------------------------------------------------

def _make_profile(**kwargs) -> MagicMock:
    """
    Returns a MagicMock that behaves like a TravelProfile ORM instance.

    Any unset attribute defaults to None so it mirrors a freshly-created
    empty profile.
    """
    defaults = {
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
    for attr, value in defaults.items():
        setattr(profile, attr, value)
    return profile


# ---------------------------------------------------------------------------
# for_itinerary tests
# ---------------------------------------------------------------------------

class TestForItinerary:
    def test_returns_non_empty_string(self):
        builder = PromptBuilder()
        result = builder.for_itinerary(destination="Paris, France", days=3)
        assert isinstance(result, str)
        assert len(result) > 100

    def test_contains_destination(self):
        builder = PromptBuilder()
        result = builder.for_itinerary(destination="Barcelona, Spain", days=4)
        assert "Barcelona, Spain" in result

    def test_contains_day_count(self):
        builder = PromptBuilder()
        result = builder.for_itinerary(destination="Rome, Italy", days=6)
        assert "6" in result

    def test_contains_companions_when_provided(self):
        builder = PromptBuilder()
        result = builder.for_itinerary(
            destination="Lisbon, Portugal",
            days=3,
            companions="family with kids",
        )
        assert "family with kids" in result

    def test_works_without_profile(self):
        """for_itinerary must work when travel_profile=None."""
        builder = PromptBuilder()
        result = builder.for_itinerary(
            destination="Amsterdam, Netherlands",
            days=2,
            travel_profile=None,
        )
        assert "Amsterdam, Netherlands" in result
        # Defaults should be applied
        assert "mid-range" in result

    def test_extracts_all_profile_fields(self):
        profile = _make_profile(
            preferred_budget="luxury",
            food_preference="halal",
            travel_style="cultural",
            adventure_level="low",
            luxury_preference="5-star hotels",
            interests=["art", "architecture"],
            travel_pace="slow",
            accessibility_requirements="elevator access required",
            language_preference="ar",
        )
        builder = PromptBuilder()
        result = builder.for_itinerary(
            destination="Dubai, UAE",
            days=4,
            travel_profile=profile,
        )
        assert "luxury" in result
        assert "halal" in result
        assert "cultural" in result
        assert "art" in result
        assert "architecture" in result
        assert "elevator access required" in result
        assert "ar" in result

    def test_with_empty_profile_falls_back_to_defaults(self):
        """An all-None profile must still produce a valid, non-empty prompt."""
        profile = _make_profile()  # all fields None
        builder = PromptBuilder()
        result = builder.for_itinerary(
            destination="Seoul, South Korea",
            days=5,
            travel_profile=profile,
        )
        assert "Seoul, South Korea" in result
        assert len(result) > 200

    def test_interests_list_included_in_prompt(self):
        profile = _make_profile(interests=["hiking", "photography"])
        builder = PromptBuilder()
        result = builder.for_itinerary(
            destination="Nepal",
            days=7,
            travel_profile=profile,
        )
        assert "hiking" in result
        assert "photography" in result


# ---------------------------------------------------------------------------
# for_chat tests
# ---------------------------------------------------------------------------

class TestForChat:
    def test_returns_non_empty_string(self):
        builder = PromptBuilder()
        result = builder.for_chat("What are the best beaches in Thailand?")
        assert isinstance(result, str)
        assert len(result) > 50

    def test_contains_user_message(self):
        builder = PromptBuilder()
        msg = "Is Marrakech safe to visit solo?"
        result = builder.for_chat(msg)
        assert msg in result

    def test_works_without_profile(self):
        builder = PromptBuilder()
        result = builder.for_chat("Best street food in Vietnam?", travel_profile=None)
        assert "Best street food in Vietnam?" in result

    def test_injects_profile_context_when_provided(self):
        profile = _make_profile(
            food_preference="vegan",
            travel_style="backpacker",
        )
        builder = PromptBuilder()
        result = builder.for_chat(
            "Where should I eat in Mexico City?",
            travel_profile=profile,
        )
        assert "vegan" in result
        assert "backpacker" in result

    def test_no_profile_block_without_profile(self):
        builder = PromptBuilder()
        result = builder.for_chat("Tell me about Patagonia.", travel_profile=None)
        assert "TRAVELLER PROFILE" not in result

    def test_profile_block_present_with_profile_data(self):
        profile = _make_profile(travel_style="adventure")
        builder = PromptBuilder()
        result = builder.for_chat("Any tips?", travel_profile=profile)
        assert "TRAVELLER PROFILE" in result

    def test_interests_joined_in_chat_prompt(self):
        profile = _make_profile(interests=["jazz", "museums", "local markets"])
        builder = PromptBuilder()
        result = builder.for_chat("Recommend Paris activities.", travel_profile=profile)
        assert "jazz" in result
        assert "museums" in result
        assert "local markets" in result
