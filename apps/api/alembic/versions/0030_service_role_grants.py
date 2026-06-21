"""Grant service_role access to adaptations and injuries tables."""

from alembic import op

revision: str = "0030_service_role_grants"
down_revision: str = "0029_injuries"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # service_role bypasses RLS but still requires GRANT-level table access
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON adaptations TO service_role")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON injuries TO service_role")


def downgrade() -> None:
    op.execute("REVOKE ALL ON adaptations FROM service_role")
    op.execute("REVOKE ALL ON injuries FROM service_role")
