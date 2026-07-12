"""
app/core/database.py
====================
SQLAlchemy engine, session factory, and the FastAPI dependency that
injects a per-request database session into route handlers.

How the session lifecycle works
--------------------------------
1. A request arrives at a route that declares `db: Session = Depends(get_db)`.
2. FastAPI calls get_db(), which opens a new session from SessionLocal.
3. The session is yielded into the route handler.
4. After the route handler returns (or raises), the finally block closes the
   session — returning the underlying connection to the pool.

Engine initialisation
----------------------
The SQLAlchemy engine and session factory are created lazily on first access
via _get_engine() and _get_session_factory(). This means:
  - Importing this module never triggers a DB connection attempt.
  - Tests and non-DB code paths can import freely without psycopg2 installed.
  - The real connection is only attempted when check_database_connection() is
    called at startup (in app/main.py lifespan) or when a route uses get_db().

This file deliberately contains NO ORM model imports. Models are defined in
app/models/ (Milestone 3) and imported by Alembic's env.py for migrations.
Importing them here would create circular dependencies.
"""

from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings


# ---------------------------------------------------------------------------
# Engine — lazy singleton
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _get_engine() -> Engine:
    """
    Builds and caches the SQLAlchemy Engine.
    Called once on first use — not at import time.
    """
    return create_engine(
        str(settings.DATABASE_URL),
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_timeout=settings.DB_POOL_TIMEOUT,
        # pool_pre_ping=True tests each connection before handing it to a
        # caller, recovering gracefully from stale connections after a DB
        # restart or network blip.
        pool_pre_ping=True,
        # Set DB_ECHO=true in .env to print every SQL statement. Dev only.
        echo=settings.DB_ECHO,
    )


# ---------------------------------------------------------------------------
# Session factory — lazy singleton
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _get_session_factory() -> sessionmaker:
    """
    Builds and caches the SQLAlchemy sessionmaker bound to the engine.
    Called once on first use.

    autocommit=False  — every write must be explicitly committed. No surprise
                        partial writes on unhandled exceptions.
    autoflush=False   — prevents SQLAlchemy from silently flushing to the DB
                        mid-transaction during attribute access.
    expire_on_commit=False — ORM objects remain usable after commit without
                        issuing a follow-up SELECT. Important for returning
                        DB-populated fields (e.g. created_at) in responses.
    """
    return sessionmaker(
        bind=_get_engine(),
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
    )


# ---------------------------------------------------------------------------
# FastAPI dependency — injected into every route that needs DB access
# ---------------------------------------------------------------------------

def get_db() -> Generator[Session, None, None]:
    """
    Yields a SQLAlchemy Session for the duration of a single request.

    Usage in a route handler:
        from sqlalchemy.orm import Session
        from fastapi import Depends
        from app.core.database import get_db

        @router.get("/example")
        def example(db: Session = Depends(get_db)):
            results = db.query(SomeModel).all()
            return results

    The session is always closed in the finally block — even when the route
    raises an unhandled exception — so connections are never leaked back to
    the pool in a broken state.
    """
    SessionLocal = _get_session_factory()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Startup connectivity check
# ---------------------------------------------------------------------------

def check_database_connection() -> None:
    """
    Executes a minimal SQL statement to confirm the database is reachable.

    Called once from app/main.py's lifespan handler at startup.
    Raises sqlalchemy.exc.OperationalError if the connection fails, which
    surfaces as a clear startup error rather than a silent misconfiguration
    that only manifests on the first real request.
    """
    with _get_engine().connect() as connection:
        connection.execute(text("SELECT 1"))
