"""
app/services/auth_service.py
=============================
Pure authentication logic: password hashing, verification, and JWT
lifecycle (create + decode).

This module contains NO FastAPI, no database, no HTTP concerns — it is
pure Python functions that can be unit-tested without any server context.

Design decisions
-----------------
- bcrypt via passlib: industry-standard adaptive hashing. The work factor
  automatically increases as hardware gets faster.
- JWT via python-jose: HS256 signing using the SECRET_KEY from settings.
- Only `user_id` (the `sub` claim) is embedded in the token. No email,
  no roles — keeping the token minimal and reducing exposure if decoded.
- Token expiry is enforced by the `exp` claim — python-jose verifies it
  automatically in decode_access_token.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings
from app.schemas.token import TokenData

# ---------------------------------------------------------------------------
# Password hashing — using bcrypt directly (passlib is incompatible with bcrypt 4.x)
# ---------------------------------------------------------------------------

def hash_password(plain_password: str) -> str:
    """
    Returns a bcrypt hash of the given plain-text password.

    The hash is safe to store in the database. The original password
    cannot be recovered from the hash.
    """
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Returns True if `plain_password` matches the stored `hashed_password`.

    Uses constant-time comparison internally to prevent timing attacks.
    """
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


# ---------------------------------------------------------------------------
# JWT operations
# ---------------------------------------------------------------------------

def create_access_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates a signed JWT access token embedding `user_id` as the `sub` claim.

    Args:
        user_id:       The user's UUID string — stored as the `sub` claim.
        expires_delta: Override the default expiry. Used in tests.

    Returns:
        A compact, URL-safe signed JWT string.
    """
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    expire = datetime.now(timezone.utc) + expires_delta

    payload = {
        "sub": user_id,          # subject — who the token identifies
        "exp": expire,            # expiry — python-jose enforces this on decode
        "iat": datetime.now(timezone.utc),  # issued-at — useful for audit logs
    }

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> TokenData:
    """
    Decodes and validates a JWT access token.

    Validates:
      - Signature (using SECRET_KEY)
      - Expiry (`exp` claim)
      - Presence of `sub` claim

    Args:
        token: The raw JWT string from the Authorization header.

    Returns:
        TokenData with the user_id extracted from the `sub` claim.

    Raises:
        jose.JWTError: If the token is invalid, expired, or tampered with.
                       The caller (get_current_user) converts this to HTTP 401.
    """
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

    user_id: Optional[str] = payload.get("sub")
    if user_id is None:
        raise JWTError("Token payload missing 'sub' claim.")

    return TokenData(user_id=user_id)