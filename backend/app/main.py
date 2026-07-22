"""
app/main.py
===========
Roamio API — FastAPI application entry point.

All routes are mounted under the /api prefix.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import check_database_connection
from app.routers import auth, chat, journeys, users


# ---------------------------------------------------------------------------
# Lifespan — startup and shutdown logic
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    check_database_connection()
    yield


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------
app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered travel companion backend — personalized itineraries powered by IBM Granite on watsonx.ai.",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/api/docs" if settings.APP_ENV != "production" else None,
    redoc_url="/api/redoc" if settings.APP_ENV != "production" else None,
    openapi_url="/api/openapi.json",
)


# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------
# Build the allowed origins list from settings.
# In development, localhost:5173 and localhost:4173 are always allowed.
# In production, set ALLOWED_ORIGINS in the environment.
_allowed_origins: list[str] = [
    "http://localhost:5173",
    "http://localhost:4173",
    "http://127.0.0.1:5173",
]

if settings.ALLOWED_ORIGINS:
    _allowed_origins.extend(
        [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routers — all mounted under /api prefix
# ---------------------------------------------------------------------------
api_router = APIRouter(prefix="/api")

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(journeys.router)
api_router.include_router(chat.router)

app.include_router(api_router)


# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------
@app.get("/api/health", tags=["Health"])
async def health_check() -> dict:
    """
    Confirms the Roamio backend is running.
    Used by the Replit proxy healthcheck.
    """
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
    }
