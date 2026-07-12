"""
app/main.py
===========
Roamio API — FastAPI application entry point.

Responsibilities:
- Instantiate the FastAPI app with metadata from settings.
- Register global middleware (CORS).
- Attach all routers (added per milestone).
- Run a database connectivity check at startup so a missing DB surfaces
  immediately as a startup error, not a mystery 500 during a request.
- Expose the /health endpoint.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import check_database_connection
from app.routers import auth, chat, journeys, users


# ---------------------------------------------------------------------------
# Lifespan — startup and shutdown logic
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs once at startup (before the first request) and once at shutdown.
    Used to verify the database is reachable before serving traffic.
    """
    # Startup
    check_database_connection()
    yield
    # Shutdown — nothing to clean up at this stage.


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------
app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered travel companion backend — personalized itineraries powered by IBM Granite.",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    # Disable docs in production.
    docs_url="/docs" if settings.APP_ENV != "production" else None,
    redoc_url="/redoc" if settings.APP_ENV != "production" else None,
)


# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------
# CORS origins are wide-open for local development.
# In production, replace "*" with the deployed frontend URL via an env var.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
# Milestone 4 — Authentication & Users
app.include_router(auth.router)
app.include_router(users.router)

# Milestone 8/9 — Journey Planner (JSON + SSE streaming)
app.include_router(journeys.router)

# Milestone 10 — Chat SSE streaming
app.include_router(chat.router)

# Future milestones:
#   Milestone 11 — travel_profile


# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    """
    Confirms the Roamio backend is running and configuration has loaded.
    Used by Docker healthchecks, load balancers, and CI pipelines.
    """
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
    }
