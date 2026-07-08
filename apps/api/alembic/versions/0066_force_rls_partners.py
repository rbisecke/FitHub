"""Add FORCE ROW LEVEL SECURITY to training_partners.

Revision ID: 0066_force_rls_partners
Revises: 0065_grants_injury_check
Create Date: 2026-07-08
"""

from alembic import op

revision = "0066_force_rls_partners"
down_revision = "0065_grants_injury_check"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE public.training_partners FORCE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.execute("ALTER TABLE public.training_partners NO FORCE ROW LEVEL SECURITY")
