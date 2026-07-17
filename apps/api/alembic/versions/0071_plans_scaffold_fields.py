"""Add scaffold fields to plans: equipment, days_per_week, target_movement_id,
max_duration_weeks, current_1rm_kg.

Revision ID: 0071_plans_scaffold_fields
Revises: 0070_goal_to_archetype
Create Date: 2026-07-09
"""

from alembic import op

revision = "0071_plans_scaffold_fields"
down_revision = "0070_goal_to_archetype"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # equipment: list of equipment tags the plan was generated for
    op.execute(
        "ALTER TABLE public.plans ADD COLUMN equipment TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]"
    )

    # days_per_week: how many training days per week (2-6)
    op.execute(
        "ALTER TABLE public.plans"
        " ADD COLUMN days_per_week INT NOT NULL DEFAULT 3"
        " CHECK (days_per_week BETWEEN 2 AND 6)"
    )

    # target_movement_id: FK to movements for skill-acquisition and one-rm-peak archetypes
    op.execute(
        "ALTER TABLE public.plans"
        " ADD COLUMN target_movement_id UUID REFERENCES public.movements(id) ON DELETE SET NULL"
    )

    # max_duration_weeks: skill-acquisition plans use this instead of weeks for total length
    op.execute(
        "ALTER TABLE public.plans"
        " ADD COLUMN max_duration_weeks INT CHECK (max_duration_weeks BETWEEN 4 AND 24)"
    )

    # current_1rm_kg: one-rm-peak plans use this to compute working loads
    op.execute(
        "ALTER TABLE public.plans ADD COLUMN current_1rm_kg NUMERIC(7,2) CHECK (current_1rm_kg > 0)"
    )

    # GRANTs so service_role and authenticated can write the new columns
    for col in (
        "equipment",
        "days_per_week",
        "target_movement_id",
        "max_duration_weeks",
        "current_1rm_kg",
    ):
        op.execute(f"GRANT INSERT ({col}) ON public.plans TO authenticated")
        op.execute(f"GRANT UPDATE ({col}) ON public.plans TO authenticated")
        op.execute(f"GRANT INSERT ({col}) ON public.plans TO service_role")
        op.execute(f"GRANT UPDATE ({col}) ON public.plans TO service_role")


def downgrade() -> None:
    for col in (
        "equipment",
        "days_per_week",
        "target_movement_id",
        "max_duration_weeks",
        "current_1rm_kg",
    ):
        op.execute(f"REVOKE UPDATE ({col}) ON public.plans FROM service_role")
        op.execute(f"REVOKE INSERT ({col}) ON public.plans FROM service_role")
        op.execute(f"REVOKE UPDATE ({col}) ON public.plans FROM authenticated")
        op.execute(f"REVOKE INSERT ({col}) ON public.plans FROM authenticated")

    op.execute("ALTER TABLE public.plans DROP COLUMN IF EXISTS current_1rm_kg")
    op.execute("ALTER TABLE public.plans DROP COLUMN IF EXISTS max_duration_weeks")
    op.execute("ALTER TABLE public.plans DROP COLUMN IF EXISTS target_movement_id")
    op.execute("ALTER TABLE public.plans DROP COLUMN IF EXISTS days_per_week")
    op.execute("ALTER TABLE public.plans DROP COLUMN IF EXISTS equipment")
