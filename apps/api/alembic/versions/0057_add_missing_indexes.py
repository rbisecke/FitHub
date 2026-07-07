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

# All indexes use CONCURRENTLY to avoid table locks, so this migration must
# run outside a transaction block. The COMMIT below ends the transaction that
# Alembic opened; Alembic will start a new one for the alembic_version insert.
_CONC = "CREATE INDEX CONCURRENTLY IF NOT EXISTS"
_INDEXES = [
    f"{_CONC} ix_injuries_user_id ON public.injuries(user_id)",
    f"{_CONC} ix_plans_user_id ON public.plans(user_id)",
    f"{_CONC} ix_coach_interactions_user_id ON public.coach_interactions(user_id)",
    f"{_CONC} ix_coach_interactions_session_id ON public.coach_interactions(session_id)",
    f"{_CONC} ix_coach_messages_session_id ON public.coach_messages(session_id)",
    f"{_CONC} ix_adaptations_user_id ON public.adaptations(user_id)",
    f"{_CONC} ix_adaptations_plan_id ON public.adaptations(plan_id)",
    f"{_CONC} ix_mesocycles_plan_id ON public.mesocycles(plan_id)",
    f"{_CONC} ix_planned_sessions_plan_id ON public.planned_sessions(plan_id)",
    f"{_CONC} ix_planned_sessions_scheduled_date ON public.planned_sessions(scheduled_date)",
    f"{_CONC} ix_planned_items_session_id ON public.planned_items(session_id)",
    f"{_CONC} ix_training_partners_partner_id ON public.training_partners(partner_id)",
    (
        f"{_CONC} ix_workouts_benchmark_id"
        " ON public.workouts(benchmark_id) WHERE benchmark_id IS NOT NULL"
    ),
]

_DROP = "DROP INDEX CONCURRENTLY IF EXISTS"
_DROP_INDEXES = [
    f"{_DROP} public.ix_injuries_user_id",
    f"{_DROP} public.ix_plans_user_id",
    f"{_DROP} public.ix_coach_interactions_user_id",
    f"{_DROP} public.ix_coach_interactions_session_id",
    f"{_DROP} public.ix_coach_messages_session_id",
    f"{_DROP} public.ix_adaptations_user_id",
    f"{_DROP} public.ix_adaptations_plan_id",
    f"{_DROP} public.ix_mesocycles_plan_id",
    f"{_DROP} public.ix_planned_sessions_plan_id",
    f"{_DROP} public.ix_planned_sessions_scheduled_date",
    f"{_DROP} public.ix_planned_items_session_id",
    f"{_DROP} public.ix_training_partners_partner_id",
    f"{_DROP} public.ix_workouts_benchmark_id",
]


def upgrade() -> None:
    op.execute("COMMIT")
    for sql in _INDEXES:
        op.execute(sql)


def downgrade() -> None:
    op.execute("COMMIT")
    for sql in _DROP_INDEXES:
        op.execute(sql)
