"""enable_rls_on_alembic_version

Revision ID: a1a4d391c80a
Revises: 0032_adaptation_rejection_reason
Create Date: 2026-06-21 14:50:41.469197

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1a4d391c80a"
down_revision: str | Sequence[str] | None = "0032_adaptation_rejection_reason"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # alembic_version has no user data but was left without RLS enabled.
    # Enabling RLS without policies blocks all access via Supabase client keys
    # (anon/authenticated) while not affecting direct psycopg connections that
    # Alembic and FastAPI use (those bypass RLS via the superuser/direct role).
    op.execute("ALTER TABLE public.alembic_version ENABLE ROW LEVEL SECURITY;")


def downgrade() -> None:
    op.execute("ALTER TABLE public.alembic_version DISABLE ROW LEVEL SECURITY;")
