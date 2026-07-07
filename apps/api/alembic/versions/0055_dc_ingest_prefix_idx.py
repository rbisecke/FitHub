"""add index on data_connections ingest token prefix

Revision ID: 0055_dc_ingest_prefix_idx
Revises: 0054_backfill_chat_msgs
Create Date: 2026-07-07
"""

from __future__ import annotations

from alembic import op

revision: str = "0055_dc_ingest_prefix_idx"
down_revision: str = "0054_backfill_chat_msgs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_dc_apple_ingest_prefix
            ON public.data_connections ((config->>'ingest_token_prefix'))
            WHERE provider = 'apple_health'
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS public.ix_dc_apple_ingest_prefix")
