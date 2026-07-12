"""Initial schema: users, travel_profiles, trips

Revision ID: 001_initial_schema
Revises:
Create Date: 2025-01-01 00:00:00

Creates the three core tables for the Roamio backend:
  - users           : registered user accounts
  - travel_profiles : persistent per-user travel preferences (one-to-one with users)
  - trips           : itinerary generation sessions (many-to-one with users)

Tables are created in dependency order:
  users → travel_profiles → trips
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# ---------------------------------------------------------------------------
# Revision identifiers
# ---------------------------------------------------------------------------
revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ---------------------------------------------------------------------------
# Upgrade — create all tables
# ---------------------------------------------------------------------------

def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. users
    # ------------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id",              sa.String(36),  primary_key=True,  nullable=False),
        sa.Column("email",           sa.String(320), unique=True,        nullable=False),
        sa.Column("hashed_password", sa.String(255),                     nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # ------------------------------------------------------------------
    # 2. travel_profiles
    # ------------------------------------------------------------------
    op.create_table(
        "travel_profiles",
        sa.Column("id",                       sa.String(36),  primary_key=True, nullable=False),
        sa.Column("user_id",                  sa.String(36),  nullable=False),
        sa.Column("preferred_budget",         sa.String(50),  nullable=True),
        sa.Column("food_preference",          sa.String(100), nullable=True),
        sa.Column("travel_style",             sa.String(100), nullable=True),
        sa.Column("adventure_level",          sa.String(50),  nullable=True),
        sa.Column("luxury_preference",        sa.String(50),  nullable=True),
        sa.Column("interests",                postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("travel_pace",              sa.String(50),  nullable=True),
        sa.Column("accessibility_requirements", sa.Text(),    nullable=True),
        sa.Column("language_preference",      sa.String(10),  nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"],
            ondelete="CASCADE",
            name="fk_travel_profiles_user_id",
        ),
        sa.UniqueConstraint("user_id", name="uq_travel_profiles_user_id"),
    )
    op.create_index("ix_travel_profiles_user_id", "travel_profiles", ["user_id"])

    # ------------------------------------------------------------------
    # 3. TripStatus enum type + trips table
    # ------------------------------------------------------------------
    tripstatus_enum = postgresql.ENUM(
        "pending", "completed", "failed",
        name="tripstatus",
        create_type=False,
    )
    tripstatus_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "trips",
        sa.Column("id",                sa.String(36),  primary_key=True, nullable=False),
        sa.Column("user_id",           sa.String(36),  nullable=False),
        sa.Column("travel_profile_id", sa.String(36),  nullable=True),
        sa.Column("destination",       sa.String(255), nullable=False),
        sa.Column("days",              sa.Integer(),   nullable=False),
        sa.Column("companions",        sa.String(100), nullable=True),
        sa.Column("itinerary",         postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "status",
            tripstatus_enum,
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"],
            ondelete="CASCADE",
            name="fk_trips_user_id",
        ),
        sa.ForeignKeyConstraint(
            ["travel_profile_id"], ["travel_profiles.id"],
            ondelete="SET NULL",
            name="fk_trips_travel_profile_id",
        ),
    )
    op.create_index("ix_trips_user_id_created_at", "trips", ["user_id", "created_at"])
    op.create_index("ix_trips_travel_profile_id",  "trips", ["travel_profile_id"])
    op.create_index("ix_trips_status",             "trips", ["status"])


# ---------------------------------------------------------------------------
# Downgrade — drop all tables in reverse dependency order
# ---------------------------------------------------------------------------

def downgrade() -> None:
    # Drop indexes first
    op.drop_index("ix_trips_status",             table_name="trips")
    op.drop_index("ix_trips_travel_profile_id",  table_name="trips")
    op.drop_index("ix_trips_user_id_created_at", table_name="trips")

    op.drop_table("trips")

    # Drop the enum type after the table that uses it
    postgresql.ENUM(name="tripstatus").drop(op.get_bind(), checkfirst=True)

    op.drop_index("ix_travel_profiles_user_id", table_name="travel_profiles")
    op.drop_table("travel_profiles")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")