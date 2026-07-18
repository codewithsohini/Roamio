"""
app/models/base.py
==================
Shared SQLAlchemy declarative base and reusable mixins.

All ORM models inherit from `Base`. The `TimestampMixin` adds `created_at`
and `updated_at` columns to any model that needs audit timestamps — keeping
that repetitive plumbing out of individual model files.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """
    Shared declarative base for all Roamio ORM models.

    All models that inherit from this class are registered in the same
    SQLAlchemy metadata object, which Alembic's env.py imports to
    auto-detect schema changes for migration generation.
    """
    pass


class TimestampMixin:
    """
    Reusable mixin that adds `created_at` and `updated_at` audit columns.

    - created_at: set once at INSERT time by the database server clock.
    - updated_at: automatically refreshed on every UPDATE by the database
                  server clock via `onupdate`.

    Using server_default/onupdate instead of Python-side defaults ensures
    correctness even when rows are modified outside of the ORM (e.g. raw SQL
    migrations or admin tooling).
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp when the row was first inserted. Set by the DB server.",
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        doc="Timestamp when the row was last updated. Refreshed by the DB server.",
    )


def generate_uuid() -> str:
    """Returns a new UUID4 string. Used as the default for UUID primary keys."""
    return str(uuid.uuid4())