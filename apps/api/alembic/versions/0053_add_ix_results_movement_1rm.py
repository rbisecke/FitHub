"""add ix_results_movement_1rm index

Revision ID: 0053_add_ix_results_movement_1rm
Revises: 0052_add_training_partners
Create Date: 2026-07-05
"""

from __future__ import annotations

from alembic import op

revision: str = "0053_add_ix_results_movement_1rm"
down_revision: str = "0052_add_training_partners"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_results_movement_1rm
            ON public.results (movement_id, estimated_1rm_kg DESC NULLS LAST)
            WHERE estimated_1rm_kg IS NOT NULL
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS public.ix_results_movement_1rm")
