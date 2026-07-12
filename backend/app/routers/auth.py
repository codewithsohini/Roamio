"""
app/routers/auth.py
====================
Authentication endpoints: user registration and login.

Endpoints
---------
POST /auth/register — create a new account + auto-create TravelProfile
POST /auth/login    — exchange credentials for a JWT access token

Design notes
------------
- Registration atomically creates both User and TravelProfile in one
  transaction. If either insert fails, both are rolled back — the DB
  never has a User without a TravelProfile.

- Login uses OAuth2PasswordRequestForm so it is compatible with Swagger
  UI's "Authorize" button and standard OAuth2 tooling.

- Passwords are hashed immediately on registration and are never logged,
  stored in plain text, or returned in any response.

- HTTP 409 is returned when a duplicate email is detected before any DB
  write is attempted, keeping the error path clean and efficient.

- HTTP 401 is returned for invalid credentials — the error message is
  deliberately vague ("Invalid email or password") to prevent user
  enumeration attacks.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.dependencies.db import get_db
from app.models.travel_profile import TravelProfile
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import UserCreate, UserResponse
from app.services.auth_service import (
    create_access_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ---------------------------------------------------------------------------
# POST /auth/register
# ---------------------------------------------------------------------------

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
    responses={
        409: {"description": "Email address is already registered."},
    },
)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> User:
    """
    Creates a new User and an associated empty TravelProfile in one
    atomic database transaction.

    - Rejects duplicate emails with HTTP 409 before touching the DB.
    - Hashes the password with bcrypt — plaintext is never persisted.
    - TravelProfile is created empty; the user fills it in later.

    Returns the created User (without any password field).
    """
    # ── 1. Check for duplicate email before any write ──────────────────────
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    # ── 2. Create User ─────────────────────────────────────────────────────
    new_user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
    )
    db.add(new_user)
    db.flush()  # assigns new_user.id without committing — needed for the FK below

    # ── 3. Auto-create empty TravelProfile ────────────────────────────────
    travel_profile = TravelProfile(user_id=new_user.id)
    db.add(travel_profile)

    # ── 4. Commit both inserts atomically ──────────────────────────────────
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    db.refresh(new_user)
    return new_user


# ---------------------------------------------------------------------------
# POST /auth/login
# ---------------------------------------------------------------------------

@router.post(
    "/login",
    response_model=Token,
    summary="Login and receive a JWT access token",
    responses={
        401: {"description": "Invalid email or password."},
    },
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> dict:
    """
    Authenticates a user by email and password.

    Accepts OAuth2PasswordRequestForm (application/x-www-form-urlencoded),
    which is the standard for OAuth2 password flow and is supported by
    Swagger UI's "Authorize" button.

    Returns a signed JWT access token on success.
    The error message is intentionally vague to prevent user enumeration.
    """
    # ── 1. Look up user by email ───────────────────────────────────────────
    user = db.query(User).filter(User.email == form_data.username).first()

    # ── 2. Verify password ─────────────────────────────────────────────────
    # Both conditions (user not found, wrong password) return the same 401
    # so attackers cannot determine whether an email is registered.
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ── 3. Issue JWT ───────────────────────────────────────────────────────
    access_token = create_access_token(user_id=user.id)

    return {"access_token": access_token, "token_type": "bearer"}
