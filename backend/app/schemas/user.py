"""
app/schemas/user.py
====================
Pydantic schemas for User request payloads and API responses.

Strict separation from the ORM model (app/models/user.py):
  - Schemas control what the API accepts and returns.
  - The ORM model controls what the database stores.
  - `hashed_password` never appears in any schema — not even internally.
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


# ---------------------------------------------------------------------------
# Request schemas (inbound)
# ---------------------------------------------------------------------------

class UserCreate(BaseModel):
    """
    Payload accepted by POST /auth/register.

    Password constraints are enforced here so invalid registrations are
    rejected before they reach the service layer or the database.
    """

    email: EmailStr = Field(
        ...,
        description="Valid email address. Used as the login identifier.",
        examples=["traveller@example.com"],
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Plain-text password. Min 8 chars. Never stored — hashed immediately.",
        examples=["SecurePass123!"],
    )

    @field_validator("password")
    @classmethod
    def password_must_not_be_blank(cls, v: str) -> str:
        if v.strip() == "":
            raise ValueError("Password must not be blank or whitespace only.")
        return v


# ---------------------------------------------------------------------------
# Response schemas (outbound)
# ---------------------------------------------------------------------------

class UserResponse(BaseModel):
    """
    Safe user representation returned in API responses.

    Deliberately excludes hashed_password — it is never exposed via the API
    under any circumstance.
    """

    id: str
    email: EmailStr
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserWithProfileResponse(UserResponse):
    """
    Extended user response that includes whether a TravelProfile exists.
    Returned by GET /users/me after a full join.
    """

    has_travel_profile: bool = Field(
        default=False,
        description="True if the user has a TravelProfile record.",
    )
