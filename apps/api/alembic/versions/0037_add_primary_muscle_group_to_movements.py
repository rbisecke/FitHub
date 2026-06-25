"""Add primary_muscle_group to movements and training-balance feature

Revision ID: 0037_add_primary_muscle_group
Revises: 0036_add_onboarding_completed
Create Date: 2026-06-25
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0037_add_primary_muscle_group"
down_revision = "0036_add_onboarding_completed"
branch_labels = None
depends_on = None

_MOVEMENT_GROUPS: list[tuple[str, str]] = [
    ("Back Squat", "legs"),
    ("Bench Press", "push"),
    ("Clean", "legs"),
    ("Clean and Jerk", "legs"),
    ("Deadlift", "legs"),
    ("Front Squat", "legs"),
    ("Handstand Push-Up", "push"),
    ("Overhead Squat", "legs"),
    ("Pull-Up", "pull"),
    ("Ring Muscle-Up", "pull"),
    ("Row", "conditioning"),
    ("Run", "conditioning"),
    ("Snatch", "legs"),
    ("Strict Press", "push"),
]


def upgrade() -> None:
    op.add_column(
        "movements",
        sa.Column("primary_muscle_group", sa.Text(), nullable=True),
        schema="public",
    )
    op.create_check_constraint(
        "ck_movements_primary_muscle_group",
        "movements",
        "primary_muscle_group IN ('pull', 'push', 'legs', 'core', 'conditioning')",
        schema="public",
    )

    # Backfill known CrossFit movements
    for name, group in _MOVEMENT_GROUPS:
        op.execute(
            f"UPDATE public.movements SET primary_muscle_group = '{group}' WHERE name = '{name}'"
        )


def downgrade() -> None:
    op.drop_constraint(
        "ck_movements_primary_muscle_group",
        "movements",
        schema="public",
        type_="check",
    )
    op.drop_column("movements", "primary_muscle_group", schema="public")
