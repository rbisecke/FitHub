"""Add frequency_target_days, graph_colour_mode, checkin_enabled to profiles.

Revision ID: 0035_add_profile_settings_fields
Revises: 0034_coach_sessions_msgs
Create Date: 2026-06-25
"""

from __future__ import annotations

from alembic import op

revision: str = "0035_add_profile_settings_fields"
down_revision: str | None = "0034_coach_sessions_msgs"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE public.profiles
            ADD COLUMN IF NOT EXISTS frequency_target_days SMALLINT NOT NULL DEFAULT 3
                CHECK (frequency_target_days BETWEEN 1 AND 7),
            ADD COLUMN IF NOT EXISTS graph_colour_mode TEXT NOT NULL DEFAULT 'intensity'
                CHECK (graph_colour_mode IN ('intensity', 'volume')),
            ADD COLUMN IF NOT EXISTS checkin_enabled BOOLEAN NOT NULL DEFAULT TRUE
    """)
    # Extend column-level UPDATE grant to cover new settings columns
    op.execute("""
        GRANT UPDATE(handle, display_name, unit_preference, timezone, bodyweight,
                     frequency_target_days, graph_colour_mode, checkin_enabled)
            ON public.profiles TO authenticated
    """)


def downgrade() -> None:
    op.execute("REVOKE UPDATE ON public.profiles FROM authenticated")
    op.execute("""
        GRANT UPDATE(handle, display_name, unit_preference, timezone, bodyweight)
            ON public.profiles TO authenticated
    """)
    op.execute("ALTER TABLE public.profiles DROP COLUMN IF EXISTS checkin_enabled")
    op.execute("ALTER TABLE public.profiles DROP COLUMN IF EXISTS graph_colour_mode")
    op.execute("ALTER TABLE public.profiles DROP COLUMN IF EXISTS frequency_target_days")
