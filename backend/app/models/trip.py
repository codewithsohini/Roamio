"""
app/models/trip.py
==================
ORM model for the `trips` table and the `TripStatus` enum.

A Trip represents one complete itinerary generation session. It holds:
  - The request inputs (destination, days, companions)
  - A snapshot reference to the TravelProfile used at generation time
  - The full structured AI output (itinerary) as a JSONB document
  - A status field tracking the generation lifecycle

Why JSONB for the itinerary?
-----------------------------
The AI output is a structured JSON object with 10 top-level sections
(daywise_itinerary, hidden_gems, food, etc.). Storing it as JSONB means:
  - The frontend can receive the full object directly from the DB.
  - PostgreSQL can index and query individual JSON fields in the future.
  - No deserialisation step — SQLAlchemy returns it as a Python dict.

Why snapshot the TravelProfile?
---------------------------------
Users update their preferences over time. If we only stored the FK, we
would lose the context under which a trip was generated. By storing
travel_profile_id as a snapshot reference, we can always reproduce exactly
which preferences drove a given itinerary.

Relationships
-------------
- trip.user           → User          (many-to-one)
- trip.travel_profile → TravelProfile (many-to-one, nullable snapshot)
"""

from __future__ import annotations

import enum
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from app.models.travel_profile import TravelProfile
    from app.models.user import User


# ---------------------------------------------------------------------------
# Status enum
# ---------------------------------------------------------------------------

class TripStatus(str, enum.Enum):
    """
    Lifecycle states for a Trip record.

    PENDING   — Trip row created; AI generation in progress.
    COMPLETED — Itinerary generated, validated, and persisted successfully.
    FAILED    — Generation or validation failed; itinerary is null.

    Inheriting from `str` makes the enum JSON-serialisable and lets
    FastAPI/Pydantic use it directly in response schemas.
    """
    PENDING   = "pending"
    COMPLETED = "completed"
    FAILED    = "failed"


# ---------------------------------------------------------------------------
# Trip model
# ---------------------------------------------------------------------------

class Trip(Base, TimestampMixin):
    """
    Represents a single itinerary generation session for a user.

    Created with status=PENDING when the user triggers generation.
    Updated to COMPLETED (with itinerary populated) or FAILED after
    the AI pipeline finishes.
    """

    __tablename__ = "trips"

    # -------------------------------------------------------------------------
    # Primary key
    # -------------------------------------------------------------------------
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=generate_uuid,
        doc="UUID v4 primary key. Emitted to the client as the first SSE event.",
    )

    # -------------------------------------------------------------------------
    # Foreign keys
    # -------------------------------------------------------------------------
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="FK to users.id. Cascade delete removes trips when user is deleted.",
    )

    travel_profile_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("travel_profiles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc=(
            "FK to travel_profiles.id. Nullable — SET NULL on profile delete "
            "preserves the trip record even if the user resets their profile. "
            "Acts as a snapshot: records which preference set drove this trip."
        ),
    )

    # -------------------------------------------------------------------------
    # Request inputs
    # -------------------------------------------------------------------------
    destination: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="The travel destination as entered by the user e.g. 'Tokyo, Japan'.",
    )

    days: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Number of travel days requested. Must be between 1 and 30.",
    )

    companions: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        doc="Who the user is travelling with e.g. 'solo', 'couple', 'family with kids'.",
    )

    # -------------------------------------------------------------------------
    # AI output
    # -------------------------------------------------------------------------
    itinerary: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        doc=(
            "The full structured AI response. Null while status=PENDING or FAILED. "
            "Schema: {trip_summary, daywise_itinerary, hidden_gems, food, shopping, "
            "stay, culture, travel_tips, estimated_budget, why_this_plan}."
        ),
    )

    # -------------------------------------------------------------------------
    # Lifecycle status
    # -------------------------------------------------------------------------
    status: Mapped[TripStatus] = mapped_column(
        Enum(TripStatus, name="tripstatus", create_type=False),
        nullable=False,
        default=TripStatus.PENDING,
        server_default=TripStatus.PENDING.value,
        doc="Generation lifecycle: pending → completed | failed.",
    )

    # -------------------------------------------------------------------------
    # Relationships
    # -------------------------------------------------------------------------
    user: Mapped[User] = relationship(
        "User",
        back_populates="trips",
        doc="The user who requested this trip.",
    )

    travel_profile: Mapped[TravelProfile | None] = relationship(
        "TravelProfile",
        back_populates="trips",
        doc="Snapshot of the TravelProfile used during itinerary generation.",
    )

    # -------------------------------------------------------------------------
    # Indexes
    # -------------------------------------------------------------------------
    __table_args__ = (
        # Most common query pattern: "give me all trips for this user, newest first"
        Index("ix_trips_user_id_created_at", "user_id", "created_at"),
        Index("ix_trips_travel_profile_id", "travel_profile_id"),
        Index("ix_trips_status", "status"),
    )

    def __repr__(self) -> str:
        return (
            f"<Trip id={self.id!r} destination={self.destination!r} "
            f"status={self.status.value!r}>"
        )
