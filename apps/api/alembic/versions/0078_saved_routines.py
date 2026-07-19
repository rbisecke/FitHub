"""Create saved_routines + saved_routine_movements (BG-24).

A SavedRoutine is a named, user-created workout template: an ordered list of
movement references (movement_id + optional implement/side) with NO logged
results attached (01 §2.9, Open Item #4). Distinct from a logged Workout, which
is why history-filtering cannot fake it.

Two tables:
  * saved_routines — the routine header (name, user-controlled display_order).
  * saved_routine_movements — the ordered movement list (one row per movement,
    position gap-free from 0). Carries a denormalized user_id so RLS and the
    defense-in-depth `AND user_id = %s` scoping are a single-table check, not a
    join through the parent — same pattern as public.results.

Both tables get RLS ENABLE + FORCE with an owner-all policy and the standard
blanket authenticated/service_role grants (mirrors 0040_add_pinned_movements).

Revision ID: 0078_saved_routines
Revises: 0077_result_scaled
Create Date: 2026-07-19
"""

from alembic import op

revision: str = "0078_saved_routines"
down_revision: str | None = "0077_result_scaled"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE public.saved_routines (
            id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            name          TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
            display_order INT  NOT NULL DEFAULT 0,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("""
        CREATE INDEX saved_routines_user_order_idx
            ON public.saved_routines (user_id, display_order)
    """)

    op.execute("""
        CREATE TABLE public.saved_routine_movements (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            routine_id  UUID NOT NULL
                REFERENCES public.saved_routines(id) ON DELETE CASCADE,
            user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            movement_id UUID NOT NULL
                REFERENCES public.movements(id) ON DELETE CASCADE,
            position    INT  NOT NULL,
            implement   TEXT,
            side        TEXT,
            UNIQUE (routine_id, position)
        )
    """)
    op.execute("""
        CREATE INDEX saved_routine_movements_routine_idx
            ON public.saved_routine_movements (routine_id, position)
    """)

    for table in ("saved_routines", "saved_routine_movements"):
        op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE public.{table} FORCE ROW LEVEL SECURITY")
        op.execute(f"""
            CREATE POLICY "{table}_owner_all"
                ON public.{table}
                FOR ALL
                TO authenticated
                USING (user_id = auth.uid())
                WITH CHECK (user_id = auth.uid())
        """)
        op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON public.{table} TO authenticated")
        op.execute(f"GRANT ALL ON public.{table} TO service_role")


def downgrade() -> None:
    for table in ("saved_routine_movements", "saved_routines"):
        op.execute(f"REVOKE ALL ON public.{table} FROM authenticated")
        op.execute(f"REVOKE ALL ON public.{table} FROM service_role")
        op.execute(f'DROP POLICY IF EXISTS "{table}_owner_all" ON public.{table}')
    op.execute("DROP INDEX IF EXISTS saved_routine_movements_routine_idx")
    op.execute("DROP INDEX IF EXISTS saved_routines_user_order_idx")
    op.execute("DROP TABLE IF EXISTS public.saved_routine_movements")
    op.execute("DROP TABLE IF EXISTS public.saved_routines")
