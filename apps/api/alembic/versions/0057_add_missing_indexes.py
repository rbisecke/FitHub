"""add missing user_id and FK indexes across core tables

Revision ID: 0057_add_missing_indexes
Revises: 0056_fk_cascade_benchmark
Create Date: 2026-07-07
"""

from __future__ import annotations

from alembic import op

revision: str = "0057_add_missing_indexes"
down_revision: str = "0056_fk_cascade_benchmark"
branch_labels = None
depends_on = None

_INDEXES = [
    "CREATE INDEX IF NOT EXISTS ix_injuries_user_id ON public.injuries(user_id)",
    "CREATE INDEX IF NOT EXISTS ix_plans_user_id ON public.plans(user_id)",
    (
        "CREATE INDEX IF NOT EXISTS ix_coach_interactions_user_id"
        " ON public.coach_interactions(user_id)"
    ),
    (
        "CREATE INDEX IF NOT EXISTS ix_coach_interactions_session_id"
        " ON public.coach_interactions(session_id)"
    ),
    "CREATE INDEX IF NOT EXISTS ix_coach_messages_session_id ON public.coach_messages(session_id)",
    "CREATE INDEX IF NOT EXISTS ix_adaptations_user_id ON public.adaptations(user_id)",
    "CREATE INDEX IF NOT EXISTS ix_adaptations_plan_id ON public.adaptations(plan_id)",
    "CREATE INDEX IF NOT EXISTS ix_mesocycles_plan_id ON public.mesocycles(plan_id)",
    ("CREATE INDEX IF NOT EXISTS ix_planned_sessions_plan_id ON public.planned_sessions(plan_id)"),
    (
        "CREATE INDEX IF NOT EXISTS ix_planned_sessions_scheduled_date"
        " ON public.planned_sessions(scheduled_date)"
    ),
    "CREATE INDEX IF NOT EXISTS ix_planned_items_session_id ON public.planned_items(session_id)",
    (
        "CREATE INDEX IF NOT EXISTS ix_training_partners_partner_id"
        " ON public.training_partners(partner_id)"
    ),
    (
        "CREATE INDEX IF NOT EXISTS ix_workouts_benchmark_id"
        " ON public.workouts(benchmark_id) WHERE benchmark_id IS NOT NULL"
    ),
]

_DROP_INDEXES = [
    "DROP INDEX IF EXISTS public.ix_injuries_user_id",
    "DROP INDEX IF EXISTS public.ix_plans_user_id",
    "DROP INDEX IF EXISTS public.ix_coach_interactions_user_id",
    "DROP INDEX IF EXISTS public.ix_coach_interactions_session_id",
    "DROP INDEX IF EXISTS public.ix_coach_messages_session_id",
    "DROP INDEX IF EXISTS public.ix_adaptations_user_id",
    "DROP INDEX IF EXISTS public.ix_adaptations_plan_id",
    "DROP INDEX IF EXISTS public.ix_mesocycles_plan_id",
    "DROP INDEX IF EXISTS public.ix_planned_sessions_plan_id",
    "DROP INDEX IF EXISTS public.ix_planned_sessions_scheduled_date",
    "DROP INDEX IF EXISTS public.ix_planned_items_session_id",
    "DROP INDEX IF EXISTS public.ix_training_partners_partner_id",
    "DROP INDEX IF EXISTS public.ix_workouts_benchmark_id",
]


def upgrade() -> None:
    for sql in _INDEXES:
        op.execute(sql)


def downgrade() -> None:
    for sql in _DROP_INDEXES:
        op.execute(sql)
