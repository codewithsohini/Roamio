"""
app/dependencies/auth.py
=========================
FastAPI dependency that authenticates every protected route.

The tokenUrl points to /api/auth/login since all routes are mounted
under the /api prefix via the api_router in main.py.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.dependencies.db import get_db
from app.models.user import User
from app.services.auth_service import decode_access_token

# tokenUrl must match the actual login endpoint after /api prefix is applied.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


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
