"""
app/schemas/journey.py
=======================
Pydantic schemas for the Journey Planner API.

Three schemas serve three distinct purposes:
  - JourneyRequest   — what the client sends to POST /journeys
  - JourneyResponse  — the full record returned after generation completes
  - JourneySummaryResponse — lightweight list item for GET /journeys (no body)

Design notes
------------
- Preference fields (budget, style, etc.) are NOT part of JourneyRequest.
  They live on TravelProfile and are loaded server-side. The client only
  tells us where, how long, and who is travelling.
- itinerary is typed as dict | None — it holds the raw structured JSON
  returned by the AI, exactly as stored in the JSONB column.
- JourneySummaryResponse deliberately omits itinerary to keep list
  payloads small. The client fetches the full body only for the detail view.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request schema — inbound from the client
# ---------------------------------------------------------------------------

class JourneyRequest(BaseModel):
    """
    Payload accepted by POST /journeys.

    Intentionally minimal: preference fields come from the authenticated
    user's TravelProfile, not from the request body. This enforces the
    v2 design principle that preferences are persistent, not per-request.
    """

    destination: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Travel destination, e.g. 'Tokyo, Japan'.",
        examples=["Tokyo, Japan"],
    )
    days: int = Field(
        ...,
        ge=1,
        le=30,
        description="Number of travel days. Must be between 1 and 30.",
        examples=[7],
    )
    companions: str | None = Field(
        default=None,
        max_length=100,
        description="Who the user is travelling with, e.g. 'solo', 'couple', 'family with kids'.",
        examples=["solo"],
    )


# ---------------------------------------------------------------------------
# Response schemas — outbound to the client
# ---------------------------------------------------------------------------

class JourneySummaryResponse(BaseModel):
    """
    Lightweight trip record for GET /journeys list endpoint.

    Excludes the itinerary body — the full JSON is only fetched on the
    detail endpoint (GET /journeys/{trip_id}) to keep list payloads small.
    """

    trip_id: str = Field(..., description="UUID of the trip record.")
    destination: str
    days: int
    companions: str | None = None
    status: str = Field(..., description="pending | completed | failed")
    created_at: datetime

    model_config = {"from_attributes": True}


class JourneyResponse(BaseModel):
    """
    Full trip record returned by GET /journeys/{trip_id} and POST /journeys.

    Includes the complete structured itinerary JSON as returned by the AI
    and persisted to the JSONB column.
    """

    trip_id: str = Field(..., description="UUID of the trip record.")
    destination: str
    days: int
    companions: str | None = None
    status: str = Field(..., description="pending | completed | failed")
    itinerary: dict[str, Any] | None = Field(
        default=None,
        description=(
            "Full structured AI output. Null while status=pending or failed. "
            "Schema: {trip_summary, daywise_itinerary, hidden_gems, food, "
            "shopping, stay, culture, travel_tips, estimated_budget, why_this_plan}."
        ),
    )
    created_at: datetime

    model_config = {"from_attributes": True}
