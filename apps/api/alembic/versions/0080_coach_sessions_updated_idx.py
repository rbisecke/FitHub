"""Add (user_id, updated_at DESC) index on coach_sessions.

Revision ID: 0080_coach_sessions_updated_idx
Revises: 0079_results_variant_index
Create Date: 2026-07-21

The session list now orders by `updated_at` (bumped on every message write) so a
session that gets a new reply resurfaces at the top, matching the resumable-session
UX in the Domain 03 coach-chat design spec (§5). The existing
`coach_sessions_user_created_idx` on `created_at` no longer serves that query.
"""

from __future__ import annotations

from alembic import op

revision = "0080_coach_sessions_updated_idx"
down_revision = "0079_results_variant_index"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Includes `id DESC` so the index fully covers list_sessions' keyset
    # tiebreak (`ORDER BY updated_at DESC, id DESC`), not just its leading sort
    # column.
    op.execute("""
        CREATE INDEX IF NOT EXISTS coach_sessions_user_updated_idx
            ON public.coach_sessions (user_id, updated_at DESC, id DESC)
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS coach_sessions_user_updated_idx")
