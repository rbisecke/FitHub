"""Create daily_checkins table for Hooper index readiness tracking.

Revision ID: e3a91f64c820
Revises: 0f53ca56f0ef
Create Date: 2026-06-19

"""

from alembic import op

revision: str = "e3a91f64c820"
down_revision: str | None = "0f53ca56f0ef"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE public.daily_checkins (
            id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
            -- One row per calendar day per user; date stored in UTC.
            date          date        NOT NULL,

            -- Hooper index: 1 (very low) – 7 (very high) for all five dimensions.
            -- Higher = worse except motivation (higher = better); AI layer normalises.
            sleep_quality smallint    CHECK (sleep_quality BETWEEN 1 AND 7),
            fatigue       smallint    CHECK (fatigue BETWEEN 1 AND 7),
            stress        smallint    CHECK (stress BETWEEN 1 AND 7),
            soreness      smallint    CHECK (soreness BETWEEN 1 AND 7),
            motivation    smallint    CHECK (motivation BETWEEN 1 AND 7),

            notes         text,
            created_at    timestamptz NOT NULL DEFAULT now(),

            UNIQUE (user_id, date)
        )
    """)

    op.execute(
        "CREATE INDEX daily_checkins_user_date_idx ON public.daily_checkins (user_id, date DESC)"
    )

    op.execute("ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE public.daily_checkins FORCE ROW LEVEL SECURITY")

    op.execute("""
        CREATE POLICY "daily_checkins_owner_select" ON public.daily_checkins FOR SELECT
            TO authenticated USING (user_id = auth.uid())
    """)
    op.execute("""
        CREATE POLICY "daily_checkins_owner_insert" ON public.daily_checkins FOR INSERT
            TO authenticated WITH CHECK (user_id = auth.uid())
    """)
    op.execute("""
        CREATE POLICY "daily_checkins_owner_update" ON public.daily_checkins FOR UPDATE
            TO authenticated
            USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())
    """)
    op.execute("""
        CREATE POLICY "daily_checkins_owner_delete" ON public.daily_checkins FOR DELETE
            TO authenticated USING (user_id = auth.uid())
    """)

    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_checkins TO authenticated")
    op.execute("GRANT ALL ON public.daily_checkins TO service_role")


def downgrade() -> None:
    op.execute("REVOKE ALL ON public.daily_checkins FROM authenticated")
    op.execute("REVOKE ALL ON public.daily_checkins FROM service_role")
    for p in (
        "daily_checkins_owner_delete",
        "daily_checkins_owner_update",
        "daily_checkins_owner_insert",
        "daily_checkins_owner_select",
    ):
        op.execute(f'DROP POLICY IF EXISTS "{p}" ON public.daily_checkins')
    op.execute("DROP INDEX IF EXISTS daily_checkins_user_date_idx")
    op.execute("DROP TABLE IF EXISTS public.daily_checkins")
