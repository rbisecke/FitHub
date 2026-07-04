"""Add 'permanent' as a valid injury status."""

from alembic import op

revision: str = "0050_injury_permanent_status"
down_revision: str = "0049_add_side_to_results"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop and recreate the CHECK constraint to include 'permanent'.
    # The constraint was added inline in 0043, so Postgres named it automatically;
    # we use ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT ... to be explicit.
    op.execute("""
        ALTER TABLE injuries
            DROP CONSTRAINT IF EXISTS injuries_status_check,
            ADD CONSTRAINT injuries_status_check
                CHECK (status IN ('active', 'cleared_with_restrictions', 'resolved', 'permanent'))
    """)


def downgrade() -> None:
    # First flip any permanent injuries back to active so the constraint can be restored.
    op.execute("""
        UPDATE injuries SET status = 'active' WHERE status = 'permanent'
    """)
    op.execute("""
        ALTER TABLE injuries
            DROP CONSTRAINT IF EXISTS injuries_status_check,
            ADD CONSTRAINT injuries_status_check
                CHECK (status IN ('active', 'cleared_with_restrictions', 'resolved'))
    """)
