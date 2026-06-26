"""Add user_pinned_movements table with RLS.

Revision ID: 0040_add_pinned_movements_table
Revises: 0039_add_profile_extended_fields
Create Date: 2026-06-26

"""

from alembic import op

revision: str = "0040_add_pinned_movements_table"
down_revision: str | None = "0039_add_profile_extended_fields"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE public.user_pinned_movements (
            id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            movement_id   UUID NOT NULL
                REFERENCES public.movements(id) ON DELETE CASCADE,
            display_order INT  NOT NULL DEFAULT 0,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (user_id, movement_id)
        )
    """)

    op.execute("""
        CREATE INDEX user_pinned_movements_user_order_idx
            ON public.user_pinned_movements (user_id, display_order)
    """)

    op.execute("ALTER TABLE public.user_pinned_movements ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE public.user_pinned_movements FORCE ROW LEVEL SECURITY")

    op.execute("""
        CREATE POLICY "pinned_movements_owner_all"
            ON public.user_pinned_movements
            FOR ALL
            TO authenticated
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid())
    """)

    op.execute("""
        GRANT SELECT, INSERT, UPDATE, DELETE
            ON public.user_pinned_movements TO authenticated
    """)
    op.execute("GRANT ALL ON public.user_pinned_movements TO service_role")


def downgrade() -> None:
    op.execute("REVOKE ALL ON public.user_pinned_movements FROM authenticated")
    op.execute("REVOKE ALL ON public.user_pinned_movements FROM service_role")
    op.execute('DROP POLICY IF EXISTS "pinned_movements_owner_all" ON public.user_pinned_movements')
    op.execute("DROP INDEX IF EXISTS user_pinned_movements_user_order_idx")
    op.execute("DROP TABLE IF EXISTS public.user_pinned_movements")
