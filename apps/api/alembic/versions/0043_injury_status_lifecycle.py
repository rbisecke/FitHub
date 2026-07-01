"""Add status lifecycle columns to injuries table (Phase B)."""

from alembic import op

revision: str = "0043_injury_status_lifecycle"
down_revision: str = "0042_injury_body_region_expand"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE injuries
            ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'cleared_with_restrictions', 'resolved')),
            ADD COLUMN IF NOT EXISTS cleared_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS restriction_notes TEXT
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE injuries
            DROP COLUMN IF EXISTS status,
            DROP COLUMN IF EXISTS cleared_at,
            DROP COLUMN IF EXISTS restriction_notes
    """)
