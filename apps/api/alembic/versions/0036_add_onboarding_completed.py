"""add onboarding_completed to profiles

Revision ID: 0036_add_onboarding_completed
Revises: 0035_add_profile_settings_fields
Create Date: 2026-06-25
"""

from __future__ import annotations

from alembic import op

revision = "0036_add_onboarding_completed"
down_revision = "0035_add_profile_settings_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "
        "onboarding_completed BOOLEAN NOT NULL DEFAULT false"
    )
    # Mark all pre-existing users as onboarded — they existed before this feature
    op.execute(
        "UPDATE public.profiles SET onboarding_completed = true WHERE onboarding_completed = false"
    )
    op.execute(
        """
        GRANT UPDATE(handle, display_name, unit_preference, timezone, bodyweight,
                     frequency_target_days, onboarding_completed,
                     graph_colour_mode, checkin_enabled)
        ON public.profiles TO authenticated
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE public.profiles DROP COLUMN IF EXISTS onboarding_completed")
