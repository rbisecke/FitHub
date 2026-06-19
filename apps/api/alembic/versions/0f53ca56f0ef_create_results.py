"""Create results per-user table.

Revision ID: 0f53ca56f0ef
Revises: 0493818b4922
Create Date: 2026-06-18

"""

from alembic import op

revision: str = "0f53ca56f0ef"
down_revision: str | None = "0493818b4922"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE public.results (
            id           uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id      uuid         NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
            workout_id   uuid         NOT NULL REFERENCES public.workouts(id)  ON DELETE CASCADE,
            movement_id  uuid                  REFERENCES public.movements(id),

            result_type  text         NOT NULL CHECK (result_type IN (
                             'weight', 'reps', 'time', 'distance',
                             'calories', 'height', 'rounds_reps', 'watts', 'pace'
                         )),

            -- Measurement fields — only the fields relevant to result_type are populated.
            load_kg      numeric(8,3),
            reps         integer,
            time_s       integer,
            distance_m   numeric(10,3),
            calories     integer,
            height_cm    numeric(6,1),
            rounds       integer,
            partial_reps integer,
            watts        integer,
            pace_s_500m  integer,

            -- Metadata
            set_index    integer,
            order_index  integer      NOT NULL DEFAULT 0,
            is_pr        boolean      NOT NULL DEFAULT false,
            notes        text,

            created_at   timestamptz  NOT NULL DEFAULT now(),
            updated_at   timestamptz  NOT NULL DEFAULT now()
        )
    """)

    op.execute("CREATE INDEX results_user_id_idx    ON public.results (user_id)")
    op.execute("CREATE INDEX results_workout_id_idx ON public.results (workout_id)")
    op.execute("""
        CREATE INDEX results_user_movement_idx
            ON public.results (user_id, movement_id)
            WHERE movement_id IS NOT NULL
    """)

    op.execute("DROP TRIGGER IF EXISTS results_updated_at ON public.results")
    op.execute("""
        CREATE TRIGGER results_updated_at
            BEFORE UPDATE ON public.results
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()
    """)

    op.execute("ALTER TABLE public.results ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE public.results FORCE ROW LEVEL SECURITY")

    op.execute("""
        CREATE POLICY "results_owner_select" ON public.results FOR SELECT
            TO authenticated USING (user_id = auth.uid())
    """)
    op.execute("""
        CREATE POLICY "results_owner_insert" ON public.results FOR INSERT
            TO authenticated WITH CHECK (user_id = auth.uid())
    """)
    op.execute("""
        CREATE POLICY "results_owner_update" ON public.results FOR UPDATE
            TO authenticated
            USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())
    """)
    op.execute("""
        CREATE POLICY "results_owner_delete" ON public.results FOR DELETE
            TO authenticated USING (user_id = auth.uid())
    """)

    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON public.results TO authenticated")
    op.execute("GRANT ALL ON public.results TO service_role")


def downgrade() -> None:
    op.execute("REVOKE ALL ON public.results FROM authenticated")
    op.execute("REVOKE ALL ON public.results FROM service_role")
    for p in (
        "results_owner_delete",
        "results_owner_update",
        "results_owner_insert",
        "results_owner_select",
    ):
        op.execute(f'DROP POLICY IF EXISTS "{p}" ON public.results')
    op.execute("DROP TRIGGER IF EXISTS results_updated_at ON public.results")
    op.execute("DROP INDEX IF EXISTS results_user_movement_idx")
    op.execute("DROP INDEX IF EXISTS results_workout_id_idx")
    op.execute("DROP INDEX IF EXISTS results_user_id_idx")
    op.execute("DROP TABLE IF EXISTS public.results")
