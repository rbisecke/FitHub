"""add team_sessions.created_by index and notifications full-scan index

Revision ID: 0059_add_indexes_v2
Revises: 0058_rls_and_not_null
Create Date: 2026-07-07
"""

from __future__ import annotations

from alembic import op

revision: str = "0059_add_indexes_v2"
down_revision: str = "0058_rls_and_not_null"
branch_labels = None
depends_on = None

_INDEXES = [
    "CREATE INDEX IF NOT EXISTS ix_team_sessions_created_by ON public.team_sessions (created_by)",
    "CREATE INDEX IF NOT EXISTS ix_notifications_user_id"
    " ON public.notifications (user_id, created_at DESC)",
]

_DROPS = [
    "DROP INDEX IF EXISTS public.ix_team_sessions_created_by",
    "DROP INDEX IF EXISTS public.ix_notifications_user_id",
]


def upgrade() -> None:
    for sql in _INDEXES:
        op.execute(sql)


def downgrade() -> None:
    for sql in _DROPS:
        op.execute(sql)
