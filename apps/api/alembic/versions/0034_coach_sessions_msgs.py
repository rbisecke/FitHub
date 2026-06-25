"""Create coach_sessions and coach_messages tables.

Revision ID: 0034_coach_sessions_msgs
Revises: 0033_mvt_default_result_type
Create Date: 2026-06-25
"""

from __future__ import annotations

from alembic import op

revision = "0034_coach_sessions_msgs"
down_revision = "0033_mvt_default_result_type"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE public.coach_sessions (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            title      TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        )
    """)

    op.execute("""
        CREATE TABLE public.coach_messages (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id  UUID NOT NULL
                            REFERENCES public.coach_sessions(id) ON DELETE CASCADE,
            role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
            content     TEXT NOT NULL,
            safety_tier TEXT,
            citations   JSONB NOT NULL DEFAULT '[]'::jsonb,
            stub        BOOLEAN NOT NULL DEFAULT false,
            created_at  TIMESTAMPTZ DEFAULT now()
        )
    """)

    op.execute("""
        CREATE INDEX coach_sessions_user_created_idx
            ON public.coach_sessions (user_id, created_at DESC)
    """)
    op.execute("""
        CREATE INDEX coach_messages_session_created_idx
            ON public.coach_messages (session_id, created_at ASC)
    """)

    op.execute("ALTER TABLE public.coach_sessions ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY")

    op.execute("""
        CREATE POLICY "owner access" ON public.coach_sessions
            USING (user_id = (SELECT auth.uid()))
    """)
    op.execute("""
        CREATE POLICY "session owner access" ON public.coach_messages
            USING (
                session_id IN (
                    SELECT id FROM public.coach_sessions
                    WHERE user_id = (SELECT auth.uid())
                )
            )
    """)

    op.execute("""
        GRANT SELECT, INSERT, UPDATE ON public.coach_sessions TO service_role
    """)
    op.execute("""
        GRANT SELECT, INSERT ON public.coach_messages TO service_role
    """)
    # SELECT to authenticated so pgTAP RLS tests can verify isolation.
    # RLS policies enforce per-user scoping; the grant alone gives no cross-user access.
    op.execute("GRANT SELECT ON public.coach_sessions TO authenticated")
    op.execute("GRANT SELECT ON public.coach_messages TO authenticated")

    # Backfill existing sessions from coach_interactions
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

    op.execute("""
        INSERT INTO public.coach_messages (session_id, role, content, stub, created_at)
        SELECT session_id, role, content, stub, created_at
        FROM coach_interactions
        WHERE session_id IS NOT NULL
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS public.coach_messages CASCADE")
    op.execute("DROP TABLE IF EXISTS public.coach_sessions CASCADE")
