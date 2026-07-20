"""
app/core/database.py
====================
SQLAlchemy engine, session factory, and the FastAPI dependency that
injects a per-request database session into route handlers.
"""

from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings


@lru_cache(maxsize=1)
def _get_engine() -> Engine:
    return create_engine(
        settings.DATABASE_URL,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_timeout=settings.DB_POOL_TIMEOUT,
        pool_pre_ping=True,
        echo=settings.DB_ECHO,
    )


@lru_cache(maxsize=1)
def _get_session_factory() -> sessionmaker:
    return sessionmaker(
        bind=_get_engine(),
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
    )


def get_db() -> Generator[Session, None, None]:
    SessionLocal = _get_session_factory()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connection() -> None:
    with _get_engine().connect() as connection:
        connection.execute(text("SELECT 1"))
