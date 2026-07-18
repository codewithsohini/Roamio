"""
app/routers/journeys.py
========================
Journey Planner API — the primary surface for itinerary generation and
retrieval.

Endpoints
---------
POST /journeys                — Generate a new itinerary (authenticated)
POST /journeys/stream         — Stream a new itinerary via SSE (authenticated)
GET  /journeys                — List the current user's past journeys (paginated)
GET  /journeys/{trip_id}      — Retrieve one journey by ID

Design notes
------------
- All endpoints require a valid JWT via get_current_user.
- POST /journeys delegates the full pipeline to RecommendationService.
  The router's only jobs are: authenticate, load the profile, call the
  service, and return the result. No AI logic, no prompt logic here.
- GET /journeys and GET /journeys/{trip_id} enforce ownership at the
  query level (filter by user_id AND id) so a user can never see
  another user's trips — even if they know the UUID.
- The JourneyResponse fields are mapped manually from the Trip ORM
  instance so the schema's `trip_id` alias is correctly populated.
- HTTP 503 is returned when the AI provider fails — it signals a
  transient upstream error that the client may retry.
- HTTP 422 is the standard FastAPI validation error for bad request bodies.

Error → HTTP mapping
--------------------
AIGenerationError / AIProviderError  → 503 Service Unavailable
ItineraryParseError                  → 502 Bad Gateway (upstream produced bad output)
ValueError (bad request data)        → 422 (handled by FastAPI automatically)
Trip not found / wrong owner         → 404 Not Found
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.ai.base import AIProvider, AIProviderError
from app.ai.factory import get_ai_provider
from app.dependencies.auth import get_current_user
from app.dependencies.db import get_db
from app.dependencies.recommendation import get_recommendation_service
from app.models.travel_profile import TravelProfile
from app.models.trip import Trip, TripStatus
from app.models.user import User
from app.schemas.journey import JourneyRequest, JourneyResponse, JourneySummaryResponse
from app.services.recommendation_service import (
    AIGenerationError,
    ItineraryParseError,
    RecommendationService,
)
from app.services.sse_service import sse_stream

router = APIRouter(prefix="/journeys", tags=["Journeys"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _trip_to_response(trip: Trip) -> JourneyResponse:
    """Map a Trip ORM instance to JourneyResponse (handles the trip_id alias)."""
    return JourneyResponse(
        trip_id=trip.id,
        destination=trip.destination,
        days=trip.days,
        companions=trip.companions,
        status=trip.status.value,
        itinerary=trip.itinerary,
        created_at=trip.created_at,
    )


def _trip_to_summary(trip: Trip) -> JourneySummaryResponse:
    """Map a Trip ORM instance to JourneySummaryResponse."""
    return JourneySummaryResponse(
        trip_id=trip.id,
        destination=trip.destination,
        days=trip.days,
        companions=trip.companions,
        status=trip.status.value,
        created_at=trip.created_at,
    )


# ---------------------------------------------------------------------------
# POST /journeys — generate a new itinerary
# ---------------------------------------------------------------------------

@router.post(
    "",
    response_model=JourneyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a new personalized itinerary",
    responses={
        401: {"description": "Not authenticated."},
        422: {"description": "Invalid request payload."},
        503: {"description": "AI provider unavailable or failed."},
        502: {"description": "AI returned an invalid response."},
    },
)
async def create_journey(
    payload: JourneyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    svc: RecommendationService = Depends(get_recommendation_service),
) -> JourneyResponse:
    """
    Generates a full personalized travel itinerary.

    1. Loads the authenticated user's TravelProfile from the database.
    2. Delegates the full generation pipeline to RecommendationService.
    3. Returns the completed Trip record including the structured JSON itinerary.

    The user's saved preferences (budget, food, style, etc.) are loaded
    automatically from their TravelProfile — they do not need to be sent
    in the request body.
    """
    # ── Load TravelProfile ─────────────────────────────────────────────────
    travel_profile: TravelProfile | None = (
        db.query(TravelProfile)
        .filter(TravelProfile.user_id == current_user.id)
        .first()
    )

    # ── Delegate to RecommendationService ─────────────────────────────────
    try:
        trip = await svc.generate_itinerary(
            request=payload,
            travel_profile=travel_profile,
            user_id=current_user.id,
            db=db,
        )
    except AIGenerationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI generation failed: {exc}",
        ) from exc
    except ItineraryParseError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI returned an invalid response: {exc}",
        ) from exc
    except AIProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI provider error: {exc}",
        ) from exc

    return _trip_to_response(trip)


# ---------------------------------------------------------------------------
# POST /journeys/stream — stream a new itinerary via SSE
# ---------------------------------------------------------------------------
#
# IMPORTANT: this route is declared BEFORE GET "" and GET "/{trip_id}" so
# that the /stream literal path is matched first — a path-parameter route
# registered after a literal route would shadow it in some ASGI routers.
#
# Pipeline (same as POST /journeys):
#   1. Auth + profile load
#   2. Build prompt via PromptBuilder (inside RecommendationService)
#   3. Create Trip(PENDING) in DB  ← emitted as first SSE event: [TRIP_ID]
#   4. Stream ai_provider.stream_completion() tokens via sse_stream
#
# Why a separate endpoint and not a query-param on POST /journeys?
# ---------------------------------------------------------------
# Mixing a StreamingResponse and a JSON response on the same path with a
# toggle parameter creates ambiguity in OpenAPI docs and in tests. A
# dedicated /stream path is explicit, self-documenting, and matches common
# practice (e.g. OpenAI's /completions vs /completions/stream pattern).

@router.post(
    "/stream",
    summary="Stream a new personalized itinerary via Server-Sent Events",
    response_description=(
        "SSE stream: [TRIP_ID] <uuid>, then tokens, then [DONE] or [ERROR]."
    ),
    responses={
        200: {"content": {"text/event-stream": {}}},
        401: {"description": "Not authenticated."},
        422: {"description": "Invalid request payload."},
    },
)
async def stream_journey(
    payload: JourneyRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    ai_provider: AIProvider = Depends(get_ai_provider),
) -> StreamingResponse:
    """
    Generates a personalized travel itinerary and streams tokens via SSE.

    The stream begins with a trip-id event so the client can track the
    session and fetch the full persisted record once streaming completes::

        data: [TRIP_ID] <uuid>\\n\\n
        data: <token>\\n\\n
        …
        data: [DONE]\\n\\n

    A Trip record with status=PENDING is created synchronously before
    streaming begins.  The status is updated to COMPLETED or FAILED at the
    conclusion of the PromptBuilder + streaming pipeline.

    On any provider error the stream ends with::

        data: [ERROR] <message>\\n\\n
    """
    from app.services.prompt_builder import PromptBuilder

    # ── Load TravelProfile ────────────────────────────────────────────────
    travel_profile: TravelProfile | None = (
        db.query(TravelProfile)
        .filter(TravelProfile.user_id == current_user.id)
        .first()
    )

    # ── Build prompt ──────────────────────────────────────────────────────
    builder = PromptBuilder()
    prompt = builder.for_itinerary(
        destination=payload.destination,
        days=payload.days,
        companions=payload.companions,
        travel_profile=travel_profile,
    )

    # ── Create Trip(PENDING) before streaming ─────────────────────────────
    from app.models.base import generate_uuid
    trip_id = generate_uuid()
    trip = Trip(
        id=trip_id,
        user_id=current_user.id,
        travel_profile_id=(travel_profile.id if travel_profile else None),
        destination=payload.destination,
        days=payload.days,
        companions=payload.companions,
        status=TripStatus.PENDING,
    )
    db.add(trip)
    db.commit()

    # ── Async generator that emits trip_id then token stream ─────────────
    async def _journey_token_gen():
        """Yield [TRIP_ID] marker, then delegate to ai_provider stream."""
        yield f"[TRIP_ID] {trip_id}"
        async for token in ai_provider.stream_completion(prompt):
            yield token

    return StreamingResponse(
        sse_stream(_journey_token_gen(), request),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ---------------------------------------------------------------------------
# GET /journeys — list the current user's past journeys
# ---------------------------------------------------------------------------

@router.get(
    "",
    response_model=list[JourneySummaryResponse],
    summary="List the authenticated user's past journeys",
    responses={
        401: {"description": "Not authenticated."},
    },
)
def list_journeys(
    limit: int = Query(default=20, ge=1, le=100, description="Number of results to return."),
    offset: int = Query(default=0, ge=0, description="Number of results to skip."),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[JourneySummaryResponse]:
    """
    Returns a paginated, newest-first list of the current user's journeys.

    The itinerary body is excluded — use GET /journeys/{trip_id} to fetch
    the full structured itinerary for a specific trip.

    Ownership is enforced at the query level: only trips belonging to the
    authenticated user are ever returned.
    """
    trips = (
        db.query(Trip)
        .filter(Trip.user_id == current_user.id)
        .order_by(Trip.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [_trip_to_summary(t) for t in trips]


# ---------------------------------------------------------------------------
# GET /journeys/{trip_id} — retrieve one journey by ID
# ---------------------------------------------------------------------------

@router.get(
    "/{trip_id}",
    response_model=JourneyResponse,
    summary="Retrieve a single journey by ID",
    responses={
        401: {"description": "Not authenticated."},
        404: {"description": "Journey not found or does not belong to the current user."},
    },
)
def get_journey(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JourneyResponse:
    """
    Returns the full journey record including the structured JSON itinerary.

    Ownership is enforced: the trip is fetched by BOTH trip_id AND user_id.
    If the trip does not exist, or exists but belongs to a different user,
    HTTP 404 is returned — the same response in both cases to prevent
    information leakage about other users' trip IDs.
    """
    trip = (
        db.query(Trip)
        .filter(Trip.id == trip_id, Trip.user_id == current_user.id)
        .first()
    )
    if trip is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journey not found.",
        )
    return _trip_to_response(trip)