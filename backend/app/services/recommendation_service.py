"""
app/services/recommendation_service.py
========================================
RecommendationService — the single orchestration entry point for itinerary
generation. All business logic for turning a user request into a persisted,
validated trip record lives here.

Architecture contract
---------------------
- This is the ONLY caller of PromptBuilder and AIProvider in the system.
- Routers call this service; they never touch GroqService or prompts directly.
- The service receives AIProvider as an abstract interface — the concrete
  GroqService is never imported here.

Pipeline (generate_itinerary)
------------------------------
1.  analyze_preferences   — merge request + profile, apply defaults
2.  PromptBuilder          — assemble the full prompt string
3.  DB write (PENDING)     — create the Trip record before any AI call
4.  ai_provider.complete() — call the AI, get the full response in one shot
5.  JSON parse             — extract the structured itinerary from the response
6.  DB write (COMPLETED)   — persist itinerary, set status=completed
    On any exception:
    DB write (FAILED)      — set status=failed, re-raise as typed exception

Why complete() instead of stream_completion()?
----------------------------------------------
The journey endpoint (Milestone 9) returns the full JSON response after
generation completes, not a live SSE token stream. A non-streaming call is
simpler, more reliable, and directly supports the request-response model.
SSE streaming support (Milestone 12) will be wired in at that stage without
any changes here — the service only changes its yielding behaviour.

Why no ResponseValidator here?
-------------------------------
ResponseValidator (Milestone 13) is not yet implemented. The service is
structured so that validation is added as a single call in stage 5 without
changing anything else. A TODO comment marks the insertion point.
"""

from __future__ import annotations

import json
import logging
from typing import TYPE_CHECKING, Any

from sqlalchemy.orm import Session

from app.ai.base import AIProvider, AIProviderError
from app.models.trip import Trip, TripStatus
from app.schemas.journey import JourneyRequest
from app.services.prompt_builder import PromptBuilder
from app.services.response_validator import (
    ResponseValidator,
    AIResponseValidationError,
)

if TYPE_CHECKING:
    from app.models.travel_profile import TravelProfile

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Typed service exceptions
# ---------------------------------------------------------------------------

class RecommendationError(Exception):
    """Base class for all RecommendationService failures."""


class AIGenerationError(RecommendationError):
    """Raised when the AI provider fails to produce a response."""


class ItineraryParseError(RecommendationError):
    """Raised when the AI response cannot be parsed as valid JSON."""


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class RecommendationService:
    """
    Orchestrates itinerary generation from request to persisted Trip record.

    Dependencies are injected via the constructor so they can be easily
    mocked in tests without patching module-level singletons.
    """

    def __init__(self, ai_provider: AIProvider, prompt_builder: PromptBuilder) -> None:
        self._ai = ai_provider
        self._builder = prompt_builder
        self._validator = ResponseValidator(ai_provider)
    # -----------------------------------------------------------------------
    # Preference analysis
    # -----------------------------------------------------------------------

    def analyze_preferences(
        self,
        request: JourneyRequest,
        travel_profile: "TravelProfile | None",
    ) -> dict[str, Any]:
        """
        Merges request fields with the user's TravelProfile to produce a
        normalised preferences dictionary.

        Rules applied:
        - All nine profile fields are included as-is (None if not set).
        - Request fields (destination, days, companions) take priority.
        - This is where future conflict resolution logic lives (e.g.
          "profile says budget but request companion count implies family
          package — escalate budget tier automatically").

        Returns:
            A flat dict of all preference fields plus the request inputs.
        """
        profile = travel_profile

        return {
            # Request inputs — always present
            "destination": request.destination,
            "days": request.days,
            "companions": request.companions,
            # Profile fields — may be None (defaults applied in PromptBuilder)
            "preferred_budget": profile.preferred_budget if profile else None,
            "food_preference": profile.food_preference if profile else None,
            "travel_style": profile.travel_style if profile else None,
            "adventure_level": profile.adventure_level if profile else None,
            "luxury_preference": profile.luxury_preference if profile else None,
            "interests": profile.interests if profile else None,
            "travel_pace": profile.travel_pace if profile else None,
            "accessibility_requirements": (
                profile.accessibility_requirements if profile else None
            ),
            "language_preference": profile.language_preference if profile else None,
        }

    # -----------------------------------------------------------------------
    # Itinerary generation
    # -----------------------------------------------------------------------

    async def generate_itinerary(
        self,
        request: JourneyRequest,
        travel_profile: "TravelProfile | None",
        user_id: str,
        db: Session,
    ) -> Trip:
        """
        Runs the full itinerary generation pipeline and returns the
        completed Trip ORM instance.

        Pipeline:
          1. analyze_preferences
          2. Build prompt via PromptBuilder
          3. Create Trip record with status=PENDING
          4. Call ai_provider.complete(prompt)
          5. Parse JSON from response
             (TODO Milestone 13: validate_and_repair goes here)
          6. Persist itinerary, set status=COMPLETED
          On any failure: set status=FAILED, re-raise typed exception

        Args:
            request:        Validated JourneyRequest from the router.
            travel_profile: The user's TravelProfile (may be None/empty).
            user_id:        The authenticated user's ID.
            db:             SQLAlchemy session for this request.

        Returns:
            The completed Trip ORM instance (status=COMPLETED, itinerary set).

        Raises:
            AIGenerationError:  If the AI provider call fails.
            ItineraryParseError: If the AI response is not valid JSON.
        """
        # ── 1. Analyse preferences ─────────────────────────────────────────
        prefs = self.analyze_preferences(request, travel_profile)

        # ── 2. Build prompt ────────────────────────────────────────────────
        prompt = self._builder.for_itinerary(
            destination=prefs["destination"],
            days=prefs["days"],
            companions=prefs["companions"],
            travel_profile=travel_profile,
        )

        # ── 3. Create Trip record (status=PENDING) ─────────────────────────
        trip = Trip(
            user_id=user_id,
            travel_profile_id=(travel_profile.id if travel_profile else None),
            destination=request.destination,
            days=request.days,
            companions=request.companions,
            status=TripStatus.PENDING,
        )
        db.add(trip)
        db.commit()
        db.refresh(trip)

        logger.info(
            "Trip %s created (status=PENDING) for user %s → %s, %d days",
            trip.id,
            user_id,
            request.destination,
            request.days,
        )

        # ── 4 & 5 & 6. AI call → parse → persist ──────────────────────────
        try:
            # ── 4. Call AI provider ────────────────────────────────────────
            try:
                raw_response = await self._ai.complete(prompt)
            except AIProviderError as exc:
                raise AIGenerationError(
                    f"AI provider failed for trip {trip.id}: {exc}"
                ) from exc

            # ── 5. Validate and repair AI response ─────────────────────────

            itinerary = await self._validator.validate_and_repair(
                raw_response=raw_response,
                original_prompt=prompt,
                expected_destination=request.destination,
                expected_days=request.days,
            )

            # ── 6. Persist (COMPLETED) ─────────────────────────────────────
            trip.itinerary = itinerary
            trip.status = TripStatus.COMPLETED
            db.commit()
            db.refresh(trip)

            logger.info("Trip %s completed successfully.", trip.id)
            return trip

        except (AIGenerationError, AIResponseValidationError):
            # Mark the trip as failed but preserve the record for debugging
            trip.status = TripStatus.FAILED
            db.commit()
            raise

        except Exception as exc:
            # Catch unexpected errors so the Trip record is always updated
            trip.status = TripStatus.FAILED
            db.commit()
            logger.error("Unexpected error on trip %s: %s", trip.id, exc)
            raise AIGenerationError(
                f"Unexpected error generating trip {trip.id}: {exc}"
            ) from exc

    # -----------------------------------------------------------------------
    # Internal helpers
    # -----------------------------------------------------------------------
# TODO:
# This helper is now superseded by ResponseValidator._parse_json().
# Remove after Milestone 13 tests pass and no references remain.
    def _parse_itinerary(self, raw_response: str, trip_id: str) -> dict[str, Any]:
        """
        Extracts a JSON object from the raw AI response string.

        Handles the common case where the model wraps JSON in markdown
        code fences (```json ... ```) despite being instructed not to.

        Args:
            raw_response: The raw string returned by the AI provider.
            trip_id:      Used in the error message for traceability.

        Returns:
            The parsed itinerary as a Python dict.

        Raises:
            ItineraryParseError: If no valid JSON object can be extracted.
        """
        text = raw_response.strip()

        # Strip markdown code fences if present
        if text.startswith("```"):
            lines = text.splitlines()
            # Remove opening fence line (```json or ```)
            lines = lines[1:]
            # Remove closing fence line if present
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines).strip()

        # Attempt to locate a JSON object by finding outermost { ... }
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise ItineraryParseError(
                f"Trip {trip_id}: AI response contains no JSON object. "
                f"Response preview: {raw_response[:200]!r}"
            )

        json_str = text[start : end + 1]

        try:
            return json.loads(json_str)
        except json.JSONDecodeError as exc:
            raise ItineraryParseError(
                f"Trip {trip_id}: AI response is not valid JSON — {exc}. "
                f"Response preview: {raw_response[:200]!r}"
            ) from exc