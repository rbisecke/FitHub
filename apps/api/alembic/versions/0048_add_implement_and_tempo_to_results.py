"""add implement and tempo columns to results

Revision ID: 0048_add_implement_and_tempo_to_results
Revises: 0047_expand_movement_catalog
Create Date: 2026-07-02

"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0048_result_implement_tempo"
down_revision: str | Sequence[str] | None = "0047_expand_movement_catalog"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE public.results
            ADD COLUMN IF NOT EXISTS implement text
                CHECK (implement IN (
                    'barbell', 'dumbbell', 'kettlebell',
                    'bodyweight', 'band', 'cable', 'machine', 'other'
                )),
            ADD COLUMN IF NOT EXISTS tempo varchar(4)
                CHECK (tempo ~ '^[0-9X]{4}$')
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE public.results
            DROP COLUMN IF EXISTS implement,
            DROP COLUMN IF EXISTS tempo
    """)
