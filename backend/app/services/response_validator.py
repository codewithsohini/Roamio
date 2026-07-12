from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from app.ai.base import AIProvider

@dataclass
class AIResponseValidationError(Exception):
    """
    Raised when an AI-generated itinerary fails validation.
    """

    message: str
    validation_errors: list[str]
    attempts: int = 0

    def __str__(self) -> str:
        return (
            f"{self.message} | "
            f"Attempts: {self.attempts} | "
            f"Errors: {', '.join(self.validation_errors)}"
        )
        
class ResponseValidator:
    """
    Validates AI-generated itineraries before they are persisted
    or returned to the client.
    """

    REQUIRED_KEYS = [
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

    def __init__(self, ai_provider: AIProvider):
        self.ai_provider = ai_provider 
        
    def _parse_json(self, raw_response: str) -> dict[str, Any]:
        """
        Extracts a JSON object from the raw AI response.
        Handles markdown code fences if present.
        """

        text = raw_response.strip()

        # Remove markdown code fences
        if text.startswith("```"):
            lines = text.splitlines()
            lines = lines[1:]

            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]

            text = "\n".join(lines).strip()

        start = text.find("{")
        end = text.rfind("}")

        if start == -1 or end == -1 or end <= start:
            raise AIResponseValidationError(
                message="No JSON object found.",
                validation_errors=["AI response contains no JSON object."],
                attempts=0,
            )

        try:
            return json.loads(text[start:end + 1])

        except json.JSONDecodeError:
            raise AIResponseValidationError(
                message="Invalid JSON.",
                validation_errors=["Response is not valid JSON."],
                attempts=0,
            )
                
    def validate(
        self,
        raw_response: str,
        expected_destination: str,
        expected_days: int,
    ) -> dict[str, Any]:
        """
        Validates the AI response and returns the parsed JSON.

        Raises:
            AIResponseValidationError
        """

        errors: list[str] = []

        parsed = self._parse_json(raw_response)

        # Check required keys
        for key in self.REQUIRED_KEYS:
            if key not in parsed:
                errors.append(f"Missing required key: {key}")

        # Stop if required keys are missing
        if errors:
            raise AIResponseValidationError(
                message="Validation failed.",
                validation_errors=errors,
                attempts=0,
            )

        # Destination check
        trip_summary = parsed.get("trip_summary", {})

        if not isinstance(trip_summary, dict):
            errors.append("trip_summary must be an object.")
            trip_summary = {}

        destination = str(trip_summary.get("destination", "")).strip()

        if destination.lower() != expected_destination.strip().lower():
            errors.append(
                f"Destination mismatch. Expected '{expected_destination}', got '{destination}'."
            )

        # Number of itinerary days
        itinerary = parsed.get("daywise_itinerary", [])

        if not isinstance(itinerary, list):
            errors.append("daywise_itinerary must be a list.")
            itinerary = []

        if len(itinerary) != expected_days:
            errors.append(
                f"Expected {expected_days} itinerary days but got {len(itinerary)}."
            )

        # Estimated budget must exist
        if not parsed.get("estimated_budget"):
            errors.append("Estimated budget is missing.")

        # Mandatory arrays cannot be empty
        mandatory_lists = [
            "daywise_itinerary",
            "hidden_gems",
            "food",
            "shopping",
            "travel_tips",
        ]

        for field in mandatory_lists:
            value = parsed.get(field)

            if not isinstance(value, list) or len(value) == 0:
                errors.append(f"{field} cannot be empty.")

        if errors:
            raise AIResponseValidationError(
                message="Validation failed.",
                validation_errors=errors,
                attempts=0,
            )

        return parsed
    
    async def validate_and_repair(
        self,
        raw_response: str,
        original_prompt: str,
        expected_destination: str,
        expected_days: int,
    ) -> dict[str, Any]:
        """
        Validates the AI response. If validation fails,
        asks the AI to repair the response and retries.

        Maximum repair attempts: 2
        """

        attempts = 0
        current_response = raw_response

        while attempts <= 2:
            try:
                return self.validate(
                    current_response,
                    expected_destination,
                    expected_days,
                )

            except AIResponseValidationError as exc:
                if attempts == 2:
                    raise AIResponseValidationError(
                        message="AI response validation failed after maximum repair attempts.",
                        validation_errors=exc.validation_errors,
                        attempts=attempts,
                    )

                repair_prompt = f"""
The following travel itinerary JSON is invalid.

Original Prompt:
{original_prompt}

Broken Response:
{current_response}

Validation Errors:
{chr(10).join(exc.validation_errors)}

Return ONLY corrected JSON.
Do not include markdown.
Do not include explanations.
"""

                current_response = await self.ai_provider.complete(repair_prompt)

                attempts += 1

        raise AIResponseValidationError(
            message="Unexpected validation failure.",
            validation_errors=["Unknown error."],
            attempts=attempts,
        )