"""add side column to results for unilateral tracking

Revision ID: 0049_add_side_to_results
Revises: 0048_add_implement_and_tempo_to_results
Create Date: 2026-07-02

"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0049_add_side_to_results"
down_revision: str | Sequence[str] | None = "0048_result_implement_tempo"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE public.results
            ADD COLUMN IF NOT EXISTS side text
                CHECK (side IN ('left', 'right', 'both'))
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS results_user_movement_side_idx
            ON public.results (user_id, movement_id, side)
            WHERE movement_id IS NOT NULL
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS results_user_movement_side_idx")
    op.execute("ALTER TABLE public.results DROP COLUMN IF EXISTS side")
