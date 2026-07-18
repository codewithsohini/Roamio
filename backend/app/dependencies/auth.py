"""
app/dependencies/auth.py
=========================
FastAPI dependency that authenticates every protected route.

How it works
------------
1. FastAPI extracts the Bearer token from the Authorization header via
   OAuth2PasswordBearer. If the header is absent, FastAPI immediately
   returns 401 — get_current_user is never called.

2. decode_access_token validates the JWT signature and expiry, returning
   a TokenData with the user_id.

3. The user_id is used to fetch the live User row from the database.
   This ensures:
     - Deleted accounts are rejected (user not found → 401).
     - The returned User object is always fresh — no stale data from a
       long-lived token.

4. The User ORM instance is returned to the route handler, which can
   access user.id, user.email, user.travel_profile, etc.

Usage in any protected route:
    from app.dependencies.auth import get_current_user
    from app.models import User

    @router.get("/protected")
    def protected(current_user: User = Depends(get_current_user)):
        return {"user_id": current_user.id}
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.dependencies.db import get_db
from app.models.user import User
from app.services.auth_service import decode_access_token

# ---------------------------------------------------------------------------
# OAuth2 scheme
# ---------------------------------------------------------------------------
# tokenUrl tells Swagger UI where to send login requests for the
# "Authorize" button. It does not restrict which routes use the scheme.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ---------------------------------------------------------------------------
# Dependency
# ---------------------------------------------------------------------------

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Validates the JWT from the Authorization header and returns the
    authenticated User ORM instance.

    HTTP 401 is raised for any of:
      - Missing Authorization header (handled by OAuth2PasswordBearer)
      - Invalid or expired JWT
      - User ID in token does not exist in the database (deleted account)

    Returns:
        The live User ORM object for the authenticated user.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        token_data = decode_access_token(token)
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == token_data.user_id).first()
    if user is None:
        raise credentials_exception

    return user