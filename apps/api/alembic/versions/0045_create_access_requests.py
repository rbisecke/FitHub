"""create_access_requests

Revision ID: 0045_create_access_requests
Revises: 0044_create_llm_usage
Create Date: 2026-07-01

"""

from collections.abc import Sequence

from alembic import op

revision: str = "0045_create_access_requests"
down_revision: str | Sequence[str] | None = "0044_create_llm_usage"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("""
        CREATE TABLE public.access_requests (
            id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
            email        TEXT        NOT NULL,
            name         TEXT        NOT NULL,
            motivation   TEXT        NOT NULL,
            status       TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'approved', 'rejected')),
            reviewed_at  TIMESTAMPTZ,
            reviewed_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
            review_note  TEXT,
            ip_hash      TEXT
        );

        CREATE UNIQUE INDEX access_requests_email_pending
            ON public.access_requests (email)
            WHERE status = 'pending';

        CREATE INDEX access_requests_status_created
            ON public.access_requests (status, created_at DESC);

        ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("""
        DROP INDEX IF EXISTS access_requests_email_pending;
        DROP INDEX IF EXISTS access_requests_status_created;
        DROP TABLE IF EXISTS public.access_requests;
    """)
