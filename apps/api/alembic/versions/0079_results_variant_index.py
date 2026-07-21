"""Add composite (user_id, movement_id, implement, side) index on results (BG-23).

Personal-record queries now group and filter on this exact tuple (04 §2A
variant-scoping fix: a barbell PR and a dumbbell PR are different
achievements, tracked separately) — see ``_fetch_best_e1rms``,
``_enrich_with_projections``, ``get_personal_records_batch``, and
``_flag_prs``. Not required for correctness, but cheap and directly matches
the new query shape. Complements, does not replace, the narrower
``results_user_movement_side_idx`` from 0049.

Revision ID: 0079_results_variant_index
Revises: 0078_saved_routines
Create Date: 2026-07-21
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0079_results_variant_index"
down_revision: str | Sequence[str] | None = "0078_saved_routines"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
        CREATE INDEX IF NOT EXISTS results_user_movement_implement_side_idx
            ON public.results (user_id, movement_id, implement, side)
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS results_user_movement_implement_side_idx")
