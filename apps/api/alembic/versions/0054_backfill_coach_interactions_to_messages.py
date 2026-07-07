"""Backfill coach_interactions into coach_messages.

Revision ID: 0054_backfill_coach_interactions_to_messages
Revises: 0053_add_ix_results_movement_1rm
Create Date: 2026-07-07
"""

from __future__ import annotations

from alembic import op

revision: str = "0054_backfill_coach_interactions_to_messages"
down_revision: str | None = "0053_add_ix_results_movement_1rm"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # Ensure coach_sessions rows exist for any session_ids in coach_interactions
    # that were added after migration 0034 ran (i.e., sessions not yet tracked there).
    op.execute("""
        INSERT INTO public.coach_sessions (id, user_id, title, created_at, updated_at)
        SELECT
            ci.session_id,
            ci.user_id,
            COALESCE(
                LEFT(
                    (SELECT q.content FROM coach_interactions q
                     WHERE q.session_id = ci.session_id
                       AND q.user_id   = ci.user_id
                       AND q.role      = 'user'
                     ORDER BY q.created_at ASC LIMIT 1),
                    200
                ),
                'Session'
            ) AS title,
            MIN(ci.created_at) AS created_at,
            MAX(ci.created_at) AS updated_at
        FROM coach_interactions ci
        WHERE ci.session_id IS NOT NULL
        GROUP BY ci.session_id, ci.user_id
        ON CONFLICT (id) DO NOTHING
    """)

    # Backfill any coach_interactions rows that are not yet present in coach_messages.
    # Migration 0034 copied everything that existed at that time; this picks up rows
    # written to coach_interactions by the non-streaming /chat endpoint after 0034 ran.
    # We identify already-migrated rows by (session_id, created_at) — the original
    # backfill preserved exact timestamps, so new rows have no match.
    op.execute("""
        INSERT INTO public.coach_messages (session_id, role, content, stub, created_at)
        SELECT ci.session_id, ci.role, ci.content, ci.stub, ci.created_at
        FROM coach_interactions ci
        WHERE ci.session_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM public.coach_messages cm
              WHERE cm.session_id = ci.session_id
                AND cm.created_at = ci.created_at
          )
    """)


def downgrade() -> None:
    pass  # Backfill is additive; no rollback needed
