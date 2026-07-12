"""
app/models/travel_profile.py
=============================
ORM model for the `travel_profiles` table.

A TravelProfile stores a user's persistent travel preferences. It is
created automatically when a user registers and updated whenever the user
changes their preferences.

Separating preferences into their own table — rather than embedding them
on the User row — means:
  - The Trip model can snapshot which preference set was used for generation.
  - Preferences can change over time without affecting past trip records.
  - The recommendation engine always has a dedicated entity to query.

Relationships
-------------
- profile.user  → User       (many-to-one, the owning user)
- profile.trips → list[Trip] (one-to-many, trips generated using this profile)
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from app.models.trip import Trip
    from app.models.user import User


class TravelProfile(Base, TimestampMixin):
    """
    Stores a user's persistent travel preferences.

    All nine preference fields are optional (nullable) because the profile
    is auto-created empty at registration and filled in progressively by
    the user. The recommendation service reads from these fields and falls
    back to sensible defaults when fields are null.
    """

    __tablename__ = "travel_profiles"

    # -------------------------------------------------------------------------
    # Primary key
    # -------------------------------------------------------------------------
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=generate_uuid,
        doc="UUID v4 primary key.",
    )

    # -------------------------------------------------------------------------
    # Foreign key — owning user
    # -------------------------------------------------------------------------
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,        # enforces the one-to-one constraint at DB level
        nullable=False,
        index=True,
        doc="FK to users.id. UNIQUE constraint enforces one profile per user.",
    )

    # -------------------------------------------------------------------------
    # Preference fields
    # All nullable — profile starts empty and is filled in by the user.
    # -------------------------------------------------------------------------

    preferred_budget: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        doc="e.g. 'budget', 'mid-range', 'luxury'. Drives cost tier of recommendations.",
    )

    food_preference: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        doc="e.g. 'vegetarian', 'vegan', 'halal', 'no restriction'.",
    )

    travel_style: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        doc="e.g. 'backpacker', 'cultural', 'adventure', 'relaxation'.",
    )

    adventure_level: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        doc="e.g. 'low', 'medium', 'high'. Controls activity intensity.",
    )

    luxury_preference: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        doc="e.g. 'budget stays', 'boutique', '5-star'. Drives accommodation tier.",
    )

    interests: Mapped[dict | list | None] = mapped_column(
        JSONB,
        nullable=True,
        doc=(
            "JSON array of interest tags e.g. ['history', 'food', 'hiking']. "
            "Stored as JSONB for efficient querying and future filtering."
        ),
    )

    travel_pace: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        doc="e.g. 'slow', 'moderate', 'fast'. Controls number of daily activities.",
    )

    accessibility_requirements: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        doc="Free-text accessibility needs e.g. 'wheelchair accessible venues only'.",
    )

    language_preference: Mapped[str | None] = mapped_column(
        String(10),
        nullable=True,
        doc="BCP-47 language tag e.g. 'en', 'fr', 'ar'. Affects response language.",
    )

    # -------------------------------------------------------------------------
    # Relationships
    # -------------------------------------------------------------------------
    user: Mapped[User] = relationship(
        "User",
        back_populates="travel_profile",
        doc="The user who owns this profile.",
    )

    trips: Mapped[list[Trip]] = relationship(
        "Trip",
        back_populates="travel_profile",
        doc="Trips that were generated using this profile as the preference snapshot.",
    )

    # -------------------------------------------------------------------------
    # Indexes
    # -------------------------------------------------------------------------
    __table_args__ = (
        Index("ix_travel_profiles_user_id", "user_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<TravelProfile id={self.id!r} user_id={self.user_id!r} "
            f"style={self.travel_style!r}>"
        )
