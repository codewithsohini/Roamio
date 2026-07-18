"""
app/routers/users.py
=====================
User profile endpoints — operations on the currently authenticated user.

Endpoints
---------
GET /users/me — return the authenticated user's account details

All endpoints in this router require a valid JWT (via get_current_user).
Future endpoints (PATCH /users/me, DELETE /users/me) will be added here.
"""

from fastapi import APIRouter, Depends

from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.user import UserWithProfileResponse

router = APIRouter(prefix="/users", tags=["Users"])


# ---------------------------------------------------------------------------
# GET /users/me
# ---------------------------------------------------------------------------

@router.get(
    "/me",
    response_model=UserWithProfileResponse,
    summary="Get the authenticated user's account details",
)
def get_me(current_user: User = Depends(get_current_user)) -> dict:
    """
    Returns the profile of the currently authenticated user.

    Requires: Authorization: Bearer <access_token>

    The `has_travel_profile` field indicates whether a TravelProfile record
    exists for this user (always True after registration, since the profile
    is auto-created).
    """
    return {
        "id": current_user.id,
        "email": current_user.email,
        "created_at": current_user.created_at,
        "updated_at": current_user.updated_at,
        "has_travel_profile": current_user.travel_profile is not None,
    }