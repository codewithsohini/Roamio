"""
app/schemas/token.py
=====================
Pydantic schemas for JWT token issuance and internal token parsing.

These schemas cross the boundary between the HTTP layer and the auth
service — they are not persisted to the database.
"""

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Outbound — returned to the client on successful login
# ---------------------------------------------------------------------------

class Token(BaseModel):
    """
    Response body for POST /auth/login.

    The client stores `access_token` and sends it on every subsequent
    request as:  Authorization: Bearer <access_token>
    """

    access_token: str = Field(
        ...,
        description="Signed JWT access token.",
    )
    token_type: str = Field(
        default="bearer",
        description="Always 'bearer'. Used by OAuth2 convention.",
    )


# ---------------------------------------------------------------------------
# Internal — decoded claims stored inside the JWT payload
# ---------------------------------------------------------------------------

class TokenData(BaseModel):
    """
    Represents the claims decoded from a validated JWT.

    Only `user_id` is embedded in the token. All other user attributes
    (email, profile, etc.) are fetched fresh from the database on each
    request via get_current_user — ensuring revoked accounts or changed
    emails are always reflected immediately.
    """

    user_id: str = Field(
        ...,
        description="The `sub` claim from the JWT — maps to users.id.",
    )