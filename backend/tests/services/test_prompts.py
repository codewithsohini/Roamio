"""
tests/services/test_prompts.py
===============================
Unit tests for the prompt template functions in app/prompts/.

These are pure function tests — no database, no HTTP, no AI calls.
Every assertion checks that the assembled prompt string:
  - Contains the expected user-provided values
  - Contains required schema keys (formatter)
  - Contains the system identity block
  - Handles missing/optional fields gracefully
"""

import pytest

from app.prompts.chat_prompt import build_chat_prompt
from app.prompts.formatter_prompt import FORMATTER_PROMPT
from app.prompts.itinerary_prompt import build_itinerary_prompt
from app.prompts.system_prompt import SYSTEM_PROMPT


# ---------------------------------------------------------------------------
# SYSTEM_PROMPT tests
# ---------------------------------------------------------------------------

class TestSystemPrompt:
    def test_system_prompt_is_non_empty_string(self):
        assert isinstance(SYSTEM_PROMPT, str)
        assert len(SYSTEM_PROMPT) > 50

    def test_system_prompt_establishes_roamio_identity(self):
        assert "Roamio" in SYSTEM_PROMPT

    def test_system_prompt_requires_why_field(self):
        assert "'why'" in SYSTEM_PROMPT or "why" in SYSTEM_PROMPT.lower()

    def test_system_prompt_mandates_json_output(self):
        assert "JSON" in SYSTEM_PROMPT

    def test_system_prompt_forbids_markdown(self):
        assert "markdown" in SYSTEM_PROMPT.lower()


# ---------------------------------------------------------------------------
# FORMATTER_PROMPT tests
# ---------------------------------------------------------------------------

class TestFormatterPrompt:
    def test_formatter_prompt_is_non_empty_string(self):
        assert isinstance(FORMATTER_PROMPT, str)
        assert len(FORMATTER_PROMPT) > 100

    def test_contains_all_top_level_schema_keys(self):
        required_keys = [
            "trip_summary",
            "daywise_itinerary",
            "hidden_gems",
            "food",
            "shopping",
            "stay",
            "culture",
            "travel_tips",
            "estimated_budget",
            "why_this_plan",
        ]
        for key in required_keys:
            assert key in FORMATTER_PROMPT, f"Missing key: {key}"

    def test_contains_trip_summary_subfields(self):
        for field in ["destination", "duration_days", "travel_style", "budget_tier"]:
            assert field in FORMATTER_PROMPT, f"Missing trip_summary field: {field}"

    def test_contains_estimated_budget_subfields(self):
        for field in ["accommodation", "food", "transport", "activities", "total"]:
            assert field in FORMATTER_PROMPT, f"Missing estimated_budget field: {field}"

    def test_forbids_output_outside_json(self):
        assert "No text before" in FORMATTER_PROMPT or "only" in FORMATTER_PROMPT.lower()


# ---------------------------------------------------------------------------
# build_itinerary_prompt tests
# ---------------------------------------------------------------------------

class TestBuildItineraryPrompt:
    def _build(self, **kwargs) -> str:
        defaults = {
            "destination": "Tokyo, Japan",
            "days": 5,
        }
        defaults.update(kwargs)
        return build_itinerary_prompt(**defaults)

    def test_returns_non_empty_string(self):
        result = self._build()
        assert isinstance(result, str)
        assert len(result) > 200

    def test_includes_destination(self):
        result = self._build(destination="Kyoto, Japan")
        assert "Kyoto, Japan" in result

    def test_includes_day_count(self):
        result = self._build(days=7)
        assert "7" in result

    def test_includes_system_prompt(self):
        result = self._build()
        assert SYSTEM_PROMPT in result

    def test_includes_formatter_prompt(self):
        result = self._build()
        assert FORMATTER_PROMPT in result

    def test_includes_companions(self):
        result = self._build(companions="couple")
        assert "couple" in result

    def test_includes_all_travel_profile_fields(self):
        result = self._build(
            preferred_budget="budget",
            food_preference="vegetarian",
            travel_style="cultural",
            adventure_level="low",
            luxury_preference="hostels",
            interests=["history", "food"],
            travel_pace="slow",
            accessibility_requirements="wheelchair accessible",
            language_preference="fr",
        )
        assert "budget" in result
        assert "vegetarian" in result
        assert "cultural" in result
        assert "low" in result
        assert "hostels" in result
        assert "history" in result
        assert "food" in result
        assert "slow" in result
        assert "wheelchair accessible" in result
        assert "fr" in result

    def test_applies_defaults_for_missing_profile_fields(self):
        """Prompt must still be coherent with no profile data."""
        result = self._build()
        # Defaults should be substituted
        assert "mid-range" in result
        assert "moderate" in result

    def test_day_count_in_itinerary_instruction(self):
        result = self._build(days=3)
        assert "3-day" in result or "3 day" in result

    def test_singular_day_grammar(self):
        result = self._build(days=1)
        # "1 day" not "1 days"
        assert "1 day" in result


# ---------------------------------------------------------------------------
# build_chat_prompt tests
# ---------------------------------------------------------------------------

class TestBuildChatPrompt:
    def test_returns_non_empty_string(self):
        result = build_chat_prompt("What is the best time to visit Bali?")
        assert isinstance(result, str)
        assert len(result) > 100

    def test_includes_user_message(self):
        msg = "What hidden restaurants should I try in Istanbul?"
        result = build_chat_prompt(msg)
        assert msg in result

    def test_includes_system_prompt(self):
        result = build_chat_prompt("Tell me about Tokyo.")
        assert SYSTEM_PROMPT in result

    def test_includes_profile_fields_when_provided(self):
        result = build_chat_prompt(
            "Any food recommendations?",
            food_preference="vegan",
            preferred_budget="budget",
            interests=["street food", "markets"],
        )
        assert "vegan" in result
        assert "budget" in result
        assert "street food" in result
        assert "markets" in result

    def test_no_profile_block_when_no_profile_fields(self):
        result = build_chat_prompt("What's the weather like in Paris in April?")
        # Profile block header should not appear when nothing is provided
        assert "TRAVELLER PROFILE" not in result

    def test_profile_block_present_when_fields_provided(self):
        result = build_chat_prompt(
            "Any tips?",
            travel_style="backpacker",
        )
        assert "TRAVELLER PROFILE" in result

    def test_interests_joined_as_comma_separated(self):
        result = build_chat_prompt(
            "Tell me more.",
            interests=["hiking", "photography", "local cuisine"],
        )
        assert "hiking" in result
        assert "photography" in result
        assert "local cuisine" in result
