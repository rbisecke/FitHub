"""add CHECK constraints on session_rpe, results rpe, mesocycles week range

Revision ID: 0061_check_constraints
Revises: 0060_not_null_v2
Create Date: 2026-07-07
"""

from __future__ import annotations

from alembic import op

revision: str = "0061_check_constraints"
down_revision: str = "0060_not_null_v2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """ALTER TABLE public.workouts
           ADD CONSTRAINT ck_workouts_session_rpe
           CHECK (session_rpe IS NULL OR session_rpe BETWEEN 0 AND 10)"""
    )
    op.execute(
        """ALTER TABLE public.results
           ADD CONSTRAINT ck_results_rpe
           CHECK (rpe IS NULL OR rpe BETWEEN 0 AND 10)"""
    )
    op.execute(
        """ALTER TABLE public.results
           ADD CONSTRAINT ck_results_rpe_target
           CHECK (rpe_target IS NULL OR rpe_target BETWEEN 0 AND 10)"""
    )
    op.execute(
        """ALTER TABLE public.mesocycles
           ADD CONSTRAINT ck_mesocycles_week_range
           CHECK (week_start >= 1 AND week_end > week_start)"""
    )


def downgrade() -> None:
    op.execute("ALTER TABLE public.mesocycles DROP CONSTRAINT IF EXISTS ck_mesocycles_week_range")
    op.execute("ALTER TABLE public.results DROP CONSTRAINT IF EXISTS ck_results_rpe_target")
    op.execute("ALTER TABLE public.results DROP CONSTRAINT IF EXISTS ck_results_rpe")
    op.execute("ALTER TABLE public.workouts DROP CONSTRAINT IF EXISTS ck_workouts_session_rpe")
