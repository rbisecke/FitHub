"""Add rejection_reason to adaptations.

Revision ID: 0032_adaptation_rejection_reason
Revises: 0031_embeddings_meta
Create Date: 2026-06-21
"""

from __future__ import annotations

from alembic import op

revision = "0032_adaptation_rejection_reason"
down_revision = "0031_embeddings_meta"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE public.adaptations ADD COLUMN IF NOT EXISTS rejection_reason TEXT")


def downgrade() -> None:
    op.execute("ALTER TABLE public.adaptations DROP COLUMN IF EXISTS rejection_reason")
