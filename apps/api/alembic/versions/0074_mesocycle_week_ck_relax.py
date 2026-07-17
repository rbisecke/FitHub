"""Fix mesocycles CHECK constraints so they accept build_scaffold's real output.

Two independent constraints on public.mesocycles have been out of sync with
plan_scaffold.py since it was introduced, both only surfaced by exercising
real (non-stub) plan generation end to end against a live DB:

  1. ck_mesocycles_week_range (migration 0061) required week_end > week_start,
     but build_scaffold's week->phase grouping legitimately produces
     single-week blocks — most commonly an isolated deload week, and
     occasionally a non-deload week squeezed between two deload weeks. Deload
     is already tracked as its own phase distinct from accumulation/
     intensification/realization, and per-week volume/intensity targets are
     computed independently of how weeks get collapsed into mesocycle rows —
     a single-week block carries no less information than a multi-week one.
     Verified: 63/63 valid (weeks, training_age) combinations in the 4-24
     week range produce at least one single-week block.

  2. mesocycles_phase_check (migration 0027, the original CREATE TABLE) never
     included 'realization' among its allowed phase values, even though it's
     one of the four entries in plan_scaffold.py's PHASE_TARGETS and is
     explicitly part of MesocycleScaffold/MesocycleOut's phase Literal type.
     Every mesocycle assigned the realization phase has always failed to
     insert. This was masked before fix (1) above because most combinations
     that reach a realization-phase mesocycle also hit the week-range bug
     first; fixing (1) alone and re-running the full input-space check
     surfaced this as a second, independent blocker.

Revision ID: 0074_mesocycle_week_ck_relax
Revises: 0073_plan_generation_tier
Create Date: 2026-07-16
"""

from alembic import op

revision = "0074_mesocycle_week_ck_relax"
down_revision = "0073_plan_generation_tier"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE public.mesocycles DROP CONSTRAINT IF EXISTS ck_mesocycles_week_range")
    op.execute(
        """ALTER TABLE public.mesocycles
           ADD CONSTRAINT ck_mesocycles_week_range
           CHECK (week_start >= 1 AND week_end >= week_start)"""
    )

    op.execute("ALTER TABLE public.mesocycles DROP CONSTRAINT IF EXISTS mesocycles_phase_check")
    op.execute(
        """ALTER TABLE public.mesocycles
           ADD CONSTRAINT mesocycles_phase_check
           CHECK (phase IN ('accumulation', 'intensification', 'realization',
                             'deload', 'peak', 'test'))"""
    )


def downgrade() -> None:
    # Both restores will fail if any row violates the original, stricter
    # constraint at downgrade time (a single-week mesocycle row for #1, a
    # realization-phase row for #2) — standard behavior for a
    # constraint-tightening downgrade in this repo (see e.g.
    # 0042_injury_body_region_expand's downgrade, which has the same caveat
    # without special-casing it).
    op.execute("ALTER TABLE public.mesocycles DROP CONSTRAINT IF EXISTS mesocycles_phase_check")
    op.execute(
        """ALTER TABLE public.mesocycles
           ADD CONSTRAINT mesocycles_phase_check
           CHECK (phase IN ('accumulation', 'intensification', 'deload', 'peak', 'test'))"""
    )

    op.execute("ALTER TABLE public.mesocycles DROP CONSTRAINT IF EXISTS ck_mesocycles_week_range")
    op.execute(
        """ALTER TABLE public.mesocycles
           ADD CONSTRAINT ck_mesocycles_week_range
           CHECK (week_start >= 1 AND week_end > week_start)"""
    )
