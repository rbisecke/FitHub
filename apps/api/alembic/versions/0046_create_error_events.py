"""create_error_events

Revision ID: 0046_create_error_events
Revises: 0045_create_access_requests
Create Date: 2026-07-01

"""

from collections.abc import Sequence

from alembic import op

revision: str = "0046_create_error_events"
down_revision: str | Sequence[str] | None = "0045_create_access_requests"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("""
        CREATE TABLE public.error_events (
            id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
            path        TEXT        NOT NULL,
            method      TEXT        NOT NULL,
            status_code INT         NOT NULL,
            error_type  TEXT,
            error_msg   TEXT,
            request_id  TEXT,
            duration_ms INT
        );

        CREATE INDEX error_events_created ON public.error_events (created_at DESC);

        ALTER TABLE public.error_events ENABLE ROW LEVEL SECURITY;
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("""
        DROP TABLE IF EXISTS public.error_events;
    """)
