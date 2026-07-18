"""
app/services/prompt_builder.py
================================
PromptBuilder — orchestrator that assembles the correct prompt for each
use case by delegating to the appropriate template function.

This is the ONLY module outside app/prompts/ that imports from the
prompts package. All callers (RecommendationService, chat router) go
through PromptBuilder — they never import prompt functions directly.

Design
------
PromptBuilder is a thin orchestrator. It adds no logic of its own;
it only selects and calls the right template function. This keeps
RecommendationService and the routers free of any prompt assembly detail.

Usage
-----
    builder = PromptBuilder()
    prompt = builder.for_itinerary(
        destination="Tokyo",
        days=5,
        travel_profile=profile,
    )
    prompt = builder.for_chat("Best ramen in Kyoto?", travel_profile=profile)
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from app.prompts.chat_prompt import build_chat_prompt
from app.prompts.itinerary_prompt import build_itinerary_prompt

if TYPE_CHECKING:
    from app.models.travel_profile import TravelProfile


class PromptBuilder:
    """
    Assembles prompts for all Roamio use cases.

    Methods are pure — no external calls, fully deterministic, fully
    testable without a database session or running server.
    """

    # -----------------------------------------------------------------------
    # Itinerary generation
    # -----------------------------------------------------------------------

    def for_itinerary(
        self,
        *,
        destination: str,
        days: int,
        companions: str | None = None,
        travel_profile: "TravelProfile | None" = None,
    ) -> str:
        """
        Builds the full itinerary generation prompt.

        Extracts all nine TravelProfile fields and passes them to
        build_itinerary_prompt(). If travel_profile is None (empty
        profile), all fields default to None and build_itinerary_prompt
        applies its built-in defaults.

        Args:
            destination:    Where the traveller is going.
            days:           Number of travel days.
            companions:     Who they are travelling with (optional).
            travel_profile: The user's TravelProfile ORM instance
                            (or None if not yet filled in).

        Returns:
            A fully assembled prompt string.
        """
        profile = travel_profile

        return build_itinerary_prompt(
            destination=destination,
            days=days,
            companions=companions,
            preferred_budget=profile.preferred_budget if profile else None,
            food_preference=profile.food_preference if profile else None,
            travel_style=profile.travel_style if profile else None,
            adventure_level=profile.adventure_level if profile else None,
            luxury_preference=profile.luxury_preference if profile else None,
            interests=profile.interests if profile else None,
            travel_pace=profile.travel_pace if profile else None,
            accessibility_requirements=(
                profile.accessibility_requirements if profile else None
            ),
            language_preference=profile.language_preference if profile else None,
        )

    # -----------------------------------------------------------------------
    # Chat
    # -----------------------------------------------------------------------

    def for_chat(
        self,
        message: str,
        *,
        travel_profile: "TravelProfile | None" = None,
    ) -> str:
        """
        Builds the full chat prompt.

        Optionally injects the user's TravelProfile context to personalise
        the chat response. If travel_profile is None, no profile block is
        injected and the model responds to the message without personalisation.

        Args:
            message:        The user's chat message.
            travel_profile: The user's TravelProfile ORM instance (optional).

        Returns:
            A fully assembled prompt string.
        """
        profile = travel_profile

        return build_chat_prompt(
            message,
            preferred_budget=profile.preferred_budget if profile else None,
            food_preference=profile.food_preference if profile else None,
            travel_style=profile.travel_style if profile else None,
            adventure_level=profile.adventure_level if profile else None,
            luxury_preference=profile.luxury_preference if profile else None,
            interests=profile.interests if profile else None,
            travel_pace=profile.travel_pace if profile else None,
            accessibility_requirements=(
                profile.accessibility_requirements if profile else None
            ),
            language_preference=profile.language_preference if profile else None,
        )