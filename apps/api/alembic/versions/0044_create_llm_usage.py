"""create_llm_usage

Revision ID: 0044_create_llm_usage
Revises: 0043_injury_status_lifecycle
Create Date: 2026-07-01

"""

from collections.abc import Sequence

from alembic import op

revision: str = "0044_create_llm_usage"
down_revision: str | Sequence[str] | None = "0043_injury_status_lifecycle"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("""
        CREATE TABLE public.llm_usage (
            id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
            user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            session_id          UUID        REFERENCES public.coach_sessions(id) ON DELETE SET NULL,
            request_id          TEXT,
            endpoint            TEXT        NOT NULL,
            model               TEXT        NOT NULL,
            input_tokens        INT         NOT NULL,
            output_tokens       INT         NOT NULL,
            cache_read_tokens   INT         NOT NULL DEFAULT 0,
            cache_write_tokens  INT         NOT NULL DEFAULT 0,
            rag_chunks_used     INT,
            max_rrf_score       FLOAT,
            ttft_ms             INT,
            duration_ms         INT,
            error_code          TEXT,
            error_msg           TEXT,
            stub                BOOLEAN     NOT NULL DEFAULT false
        );

        CREATE INDEX llm_usage_user_created ON public.llm_usage (user_id, created_at DESC);
        CREATE INDEX llm_usage_created      ON public.llm_usage (created_at DESC);

        ALTER TABLE public.llm_usage ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "llm_usage_select_own"
            ON public.llm_usage FOR SELECT
            TO authenticated
            USING (user_id = auth.uid());

        GRANT SELECT ON public.llm_usage TO authenticated;
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("""
        DROP POLICY IF EXISTS "llm_usage_select_own" ON public.llm_usage;
        DROP TABLE IF EXISTS public.llm_usage;
    """)
