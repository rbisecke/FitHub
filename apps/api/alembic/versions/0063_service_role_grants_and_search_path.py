"""Add missing service_role GRANTs and fix pi_owns_session search_path.

Revision ID: 0063_grants_search_path
Revises: 0062_grants_and_fk
Create Date: 2026-07-07
"""

from alembic import op

revision = "0063_grants_search_path"
down_revision = "0062_grants_and_fk"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # DB3-NEW-1
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_requests TO service_role")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON public.error_events TO service_role")
    # DB3-NEW-2
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO service_role")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON public.mesocycles TO service_role")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON public.planned_sessions TO service_role")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON public.planned_items TO service_role")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_tasks TO service_role")
    # DB3-NEW-3
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_connections TO service_role")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON public.metric_samples TO service_role")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON public.derived_metrics TO service_role")
    # DB3-NEW-4
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON public.coaching_embeddings TO service_role")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_interactions TO service_role")
    # DB3-NEW-5: fix pi_owns_session SECURITY DEFINER missing SET search_path
    op.execute("""
        CREATE OR REPLACE FUNCTION public.pi_owns_session(session_id uuid)
        RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
        SET search_path = public AS $$
            SELECT EXISTS (
                SELECT 1 FROM public.planned_sessions
                WHERE id = session_id AND user_id = (SELECT auth.uid())
            );
        $$
    """)


def downgrade() -> None:
    op.execute("REVOKE SELECT, INSERT, UPDATE, DELETE ON public.access_requests FROM service_role")
    op.execute("REVOKE SELECT, INSERT, UPDATE, DELETE ON public.error_events FROM service_role")
    op.execute("REVOKE SELECT, INSERT, UPDATE, DELETE ON public.plans FROM service_role")
    op.execute("REVOKE SELECT, INSERT, UPDATE, DELETE ON public.mesocycles FROM service_role")
    op.execute("REVOKE SELECT, INSERT, UPDATE, DELETE ON public.planned_sessions FROM service_role")
    op.execute("REVOKE SELECT, INSERT, UPDATE, DELETE ON public.planned_items FROM service_role")
    op.execute("REVOKE SELECT, INSERT, UPDATE, DELETE ON public.plan_tasks FROM service_role")
    op.execute("REVOKE SELECT, INSERT, UPDATE, DELETE ON public.data_connections FROM service_role")
    op.execute("REVOKE SELECT, INSERT, UPDATE, DELETE ON public.metric_samples FROM service_role")
    op.execute("REVOKE SELECT, INSERT, UPDATE, DELETE ON public.derived_metrics FROM service_role")
    op.execute(
        "REVOKE SELECT, INSERT, UPDATE, DELETE ON public.coaching_embeddings FROM service_role"
    )
    op.execute(
        "REVOKE SELECT, INSERT, UPDATE, DELETE ON public.coach_interactions FROM service_role"
    )
