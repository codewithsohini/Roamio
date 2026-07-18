"""
app/models/__init__.py
=======================
Exports all ORM models from a single import point.

Alembic's env.py imports Base.metadata from here so that all table
definitions are registered before autogenerate scans the schema.

Usage:
    from app.models import User, TravelProfile, Trip
    from app.models import Base   # for Alembic env.py
"""

from app.models.base import Base, TimestampMixin
from app.models.travel_profile import TravelProfile
from app.models.trip import Trip, TripStatus
from app.models.user import User

__all__ = [
    "Base",
    "TimestampMixin",
    "User",
    "TravelProfile",
    "Trip",
    "TripStatus",
]