"""Add service_role GRANTs for llm_usage + benchmarks, add injuries sync CHECK.

Revision ID: 0065_grants_injury_check
Revises: 0064_force_rls
Create Date: 2026-07-08
"""

from alembic import op

revision = "0065_grants_injury_check"
down_revision = "0064_force_rls"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # DB4-NEW-1: llm_usage was missing from 0063's GRANT sweep
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON public.llm_usage TO service_role")
    # DB4-NEW-4: benchmarks was missing from 0063's GRANT sweep
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON public.benchmarks TO service_role")
    # DB4-NEW-3: resolved injuries must not stay active; permanent injuries stay active by design
    op.execute("""
        ALTER TABLE public.injuries
        ADD CONSTRAINT injuries_active_status_sync
        CHECK (NOT (status = 'resolved' AND active = true))
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE public.injuries DROP CONSTRAINT IF EXISTS injuries_active_status_sync")
    op.execute("REVOKE SELECT, INSERT, UPDATE, DELETE ON public.benchmarks FROM service_role")
    op.execute("REVOKE SELECT, INSERT, UPDATE, DELETE ON public.llm_usage FROM service_role")
