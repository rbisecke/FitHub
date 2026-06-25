"""Add is_tag boolean to workouts

Revision ID: 0038_add_is_tag
Revises: 0037_add_primary_muscle_group
Create Date: 2026-06-25
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0038_add_is_tag"
down_revision = "0037_add_primary_muscle_group"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "workouts",
        sa.Column("is_tag", sa.Boolean(), nullable=False, server_default="false"),
        schema="public",
    )


def downgrade() -> None:
    op.drop_column("workouts", "is_tag", schema="public")
