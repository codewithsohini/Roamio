"""
alembic/env.py
==============
Alembic environment configuration for Roamio.

Key responsibilities:
1. Pull DATABASE_URL from app.core.config.settings (not from alembic.ini)
   so there is a single source of truth for the connection string.
2. Import all ORM models via app.models so that Alembic's autogenerate can
   compare the current schema against the ORM model definitions.
3. Support both offline mode (generates SQL without connecting) and
   online mode (connects and runs migrations directly).
"""

import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

# ---------------------------------------------------------------------------
# Ensure the backend/ directory is on sys.path so `app` is importable.
# ---------------------------------------------------------------------------
# __file__ is  backend/alembic/env.py
# parent.parent is  backend/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# ---------------------------------------------------------------------------
# Import application config and models
# ---------------------------------------------------------------------------
from app.core.config import settings  # noqa: E402
from app.models import Base  # noqa: E402 — registers all models on Base.metadata

# Alembic Config object — provides access to alembic.ini values.
config = context.config

# Wire python logging to alembic.ini [loggers] section.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Override the sqlalchemy.url from alembic.ini with the real DATABASE_URL.
# This is the single source of truth — never hard-code credentials in alembic.ini.
config.set_main_option("sqlalchemy.url", str(settings.DATABASE_URL))

# The metadata object that autogenerate inspects to detect schema changes.
target_metadata = Base.metadata


# ---------------------------------------------------------------------------
# Offline migration mode
# ---------------------------------------------------------------------------
# Generates a SQL script without connecting to the database.
# Useful for reviewing migrations before applying them.

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode — generates SQL without a live DB."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # Detect column type changes (e.g. String → Text) in autogenerate.
        compare_type=True,
        # Include schema-level CHECK constraints in autogenerate output.
        render_as_batch=False,
    )
    with context.begin_transaction():
        context.run_migrations()


# ---------------------------------------------------------------------------
# Online migration mode
# ---------------------------------------------------------------------------
# Connects to the database and applies migrations directly.

def run_migrations_online() -> None:
    """Run migrations in 'online' mode — connects and applies immediately."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,  # no pooling during migrations
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()