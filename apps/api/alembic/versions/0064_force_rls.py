"""Force row level security on remaining user-data tables.

Revision ID: 0064_force_rls
Revises: 0063_service_role_grants_and_search_path
Create Date: 2026-07-07
"""

from alembic import op

revision = "0064_force_rls"
down_revision = "0063_service_role_grants_and_search_path"
branch_labels = None
depends_on = None

_TABLES = [
    "coach_interactions",
    "data_connections",
    "metric_samples",
    "derived_metrics",
    "plans",
    "mesocycles",
    "planned_sessions",
    "planned_items",
    "plan_tasks",
    "adaptations",
    "injuries",
    "coach_sessions",
    "coach_messages",
    "llm_usage",
]


def upgrade() -> None:
    for t in _TABLES:
        op.execute(f"ALTER TABLE public.{t} FORCE ROW LEVEL SECURITY")


def downgrade() -> None:
    for t in _TABLES:
        op.execute(f"ALTER TABLE public.{t} NO FORCE ROW LEVEL SECURITY")
