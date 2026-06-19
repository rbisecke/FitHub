"""Create workouts per-user table.

Revision ID: 0493818b4922
Revises: 710f16a138c9
Create Date: 2026-06-18

"""

from alembic import op

revision: str = "0493818b4922"
down_revision: str | None = "710f16a138c9"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE public.workouts (
            id            uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id       uuid         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
            performed_at  timestamptz  NOT NULL,
            title         text,
            short_hash    text         NOT NULL,
            notes         text,
            bodyweight_kg numeric(6,2),

            -- Session classification
            session_type  text
                CHECK (session_type IN (
                    'strength', 'metcon', 'skill', 'mixed',
                    'rest', 'deload', 'active_recovery'
                )),
            workout_format text
                CHECK (workout_format IN (
                    'strength', 'amrap', 'emom', 'for_time',
                    'tabata', 'intervals', 'chipper', 'benchmark', 'open',
                    'partner', 'team'
                )),
            time_cap_s    integer,
            location      text,

            -- Tier 0 load (always-on; no wearable required)
            -- perceived_load_au = session_rpe × (duration_s / 60), stored for fast ACWR queries
            session_rpe      numeric(3,1),
            duration_s       integer,
            perceived_load_au integer,

            -- Mechanical load: Σ sets × reps × load_kg across all results
            volume_load_kg numeric(12,2),

            -- Tier 2+ wearable-derived; populated by the sync job, null until then
            avg_hr   smallint,
            max_hr   smallint,
            trimp_au numeric(8,2),

            created_at    timestamptz  NOT NULL DEFAULT now(),
            updated_at    timestamptz  NOT NULL DEFAULT now(),
            UNIQUE (user_id, short_hash)
        )
    """)

    op.execute("""
        CREATE INDEX workouts_user_performed
            ON public.workouts (user_id, performed_at DESC)
    """)

    op.execute("DROP TRIGGER IF EXISTS workouts_updated_at ON public.workouts")
    op.execute("""
        CREATE TRIGGER workouts_updated_at
            BEFORE UPDATE ON public.workouts
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()
    """)

    op.execute("ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE public.workouts FORCE ROW LEVEL SECURITY")

    op.execute("""
        CREATE POLICY "workouts_owner_select" ON public.workouts FOR SELECT
            TO authenticated USING (user_id = auth.uid())
    """)
    op.execute("""
        CREATE POLICY "workouts_owner_insert" ON public.workouts FOR INSERT
            TO authenticated WITH CHECK (user_id = auth.uid())
    """)
    op.execute("""
        CREATE POLICY "workouts_owner_update" ON public.workouts FOR UPDATE
            TO authenticated
            USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())
    """)
    op.execute("""
        CREATE POLICY "workouts_owner_delete" ON public.workouts FOR DELETE
            TO authenticated USING (user_id = auth.uid())
    """)

    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON public.workouts TO authenticated")
    op.execute("GRANT ALL ON public.workouts TO service_role")


def downgrade() -> None:
    op.execute("REVOKE ALL ON public.workouts FROM authenticated")
    op.execute("REVOKE ALL ON public.workouts FROM service_role")
    for p in (
        "workouts_owner_delete",
        "workouts_owner_update",
        "workouts_owner_insert",
        "workouts_owner_select",
    ):
        op.execute(f'DROP POLICY IF EXISTS "{p}" ON public.workouts')
    op.execute("DROP TRIGGER IF EXISTS workouts_updated_at ON public.workouts")
    op.execute("DROP INDEX IF EXISTS workouts_user_performed")
    op.execute("DROP TABLE IF EXISTS public.workouts")
