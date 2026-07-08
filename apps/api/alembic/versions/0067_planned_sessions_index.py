"""Add composite index on planned_sessions(plan_id, scheduled_date)

Revision ID: 0067_planned_sessions_index
Revises: 0066_force_rls_partners
Create Date: 2026-07-08
"""

from alembic import op

revision = "0067_planned_sessions_index"
down_revision = "0066_force_rls_partners"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_planned_sessions_plan_id_scheduled_date",
        "planned_sessions",
        ["plan_id", "scheduled_date"],
    )


def downgrade() -> None:
    op.drop_index("ix_planned_sessions_plan_id_scheduled_date", "planned_sessions")
