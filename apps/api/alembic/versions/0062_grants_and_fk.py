"""add GRANT on training_partners and FK from coach_interactions to coach_sessions

Revision ID: 0062_grants_and_fk
Revises: 0061_check_constraints
Create Date: 2026-07-07
"""

from __future__ import annotations

from alembic import op

revision: str = "0062_grants_and_fk"
down_revision: str = "0061_check_constraints"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """GRANT SELECT, INSERT, UPDATE, DELETE
           ON public.training_partners TO authenticated"""
    )
    op.execute("GRANT ALL ON public.training_partners TO service_role")
    op.execute(
        """ALTER TABLE public.coach_interactions
           ADD CONSTRAINT coach_interactions_session_id_fkey
           FOREIGN KEY (session_id)
           REFERENCES public.coach_sessions(id) ON DELETE SET NULL"""
    )


def downgrade() -> None:
    op.execute(
        """ALTER TABLE public.coach_interactions
           DROP CONSTRAINT IF EXISTS coach_interactions_session_id_fkey"""
    )
    op.execute("REVOKE ALL ON public.training_partners FROM authenticated, service_role")
