"""
tests/conftest.py
==================
Shared pytest configuration and fixtures for all Roamio tests.

SQLite compatibility for tests
-------------------------------
The ORM models use PostgreSQL-specific types (JSONB, native Enum) that
SQLite does not understand. This conftest resolves that by:

1. Creating a parallel SQLite-compatible table schema manually — only
   the columns needed for auth tests (users + travel_profiles) are
   created here using standard JSON and VARCHAR types.

2. Overriding the `get_db` dependency with a session bound to the
   SQLite test engine.

This approach means:
  - No live PostgreSQL is needed to run the test suite.
  - The production ORM models are NOT modified — they stay clean.
  - The test schema mirrors the real schema structurally.
"""

import pytest
from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    Integer,
    JSON,
    MetaData,
    String,
    Table,
    Text,
    UniqueConstraint,
    create_engine,
    text,
)
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db

# ---------------------------------------------------------------------------
# In-memory SQLite engine — shared across all tests in a session
# ---------------------------------------------------------------------------
TEST_DATABASE_URL = "sqlite://"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    bind=test_engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

# ---------------------------------------------------------------------------
# SQLite-compatible schema
# Mirrors the production schema but uses JSON instead of JSONB,
# VARCHAR for Enum, and no PostgreSQL-specific constructs.
# ---------------------------------------------------------------------------
test_metadata = MetaData()

users_table = Table(
    "users",
    test_metadata,
    Column("id",              String(36),  primary_key=True),
    Column("email",           String(320), unique=True, nullable=False),
    Column("hashed_password", String(255), nullable=False),
    Column("created_at",      DateTime,    server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at",      DateTime,    server_default=text("CURRENT_TIMESTAMP")),
)

travel_profiles_table = Table(
    "travel_profiles",
    test_metadata,
    Column("id",                       String(36),  primary_key=True),
    Column("user_id",                  String(36),  nullable=False, unique=True),
    Column("preferred_budget",         String(50),  nullable=True),
    Column("food_preference",          String(100), nullable=True),
    Column("travel_style",             String(100), nullable=True),
    Column("adventure_level",          String(50),  nullable=True),
    Column("luxury_preference",        String(50),  nullable=True),
    Column("interests",                JSON,        nullable=True),
    Column("travel_pace",              String(50),  nullable=True),
    Column("accessibility_requirements", Text,      nullable=True),
    Column("language_preference",      String(10),  nullable=True),
    Column("created_at",               DateTime,    server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at",               DateTime,    server_default=text("CURRENT_TIMESTAMP")),
    UniqueConstraint("user_id", name="uq_travel_profiles_user_id"),
)

trips_table = Table(
    "trips",
    test_metadata,
    Column("id",                String(36),  primary_key=True),
    Column("user_id",           String(36),  nullable=False),
    Column("travel_profile_id", String(36),  nullable=True),
    Column("destination",       String(255), nullable=False),
    Column("days",              Integer,     nullable=False),
    Column("companions",        String(100), nullable=True),
    Column("itinerary",         JSON,        nullable=True),
    Column("status",            String(20),  nullable=False, default="pending"),
    Column("created_at",        DateTime,    server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at",        DateTime,    server_default=text("CURRENT_TIMESTAMP")),
)


# ---------------------------------------------------------------------------
# Session-scoped DB setup / teardown
# ---------------------------------------------------------------------------

@pytest.fixture(scope="function", autouse=True)
def setup_test_db():
    """
    Creates all test tables before each test, drops them after.
    Ensures a perfectly clean database state for every test function.
    """
    test_metadata.create_all(bind=test_engine)
    yield
    test_metadata.drop_all(bind=test_engine)


# ---------------------------------------------------------------------------
# Dependency override fixture
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def override_db(setup_test_db):
    """
    Injects the SQLite test session into every FastAPI route that
    calls Depends(get_db).

    autouse=True means every test gets this override automatically —
    no need to request it explicitly in individual test functions.
    """
    from app.main import app

    def _override():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override
    yield
    app.dependency_overrides.clear()
