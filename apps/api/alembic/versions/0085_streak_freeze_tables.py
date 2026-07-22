"""Create streak_state and streak_freeze_events for server-side streak/freeze tracking.

Revision ID: 0085_streak_freeze_tables
Revises: 0084_dc_sync_outcome
Create Date: 2026-07-22

Backs the new `GET /api/v1/profile/streak` endpoint (BG-17/BG-18). Two tables:

- `streak_state`: one row per user, holding the bounded (0-2) streak-freeze
  inventory. Created lazily on first read via `INSERT ... ON CONFLICT DO
  NOTHING`, not by this migration.
- `streak_freeze_events`: an append-only ledger of freeze consumption
  ('consumed') and milestone grants ('granted'). The two unique constraints
  are what make lazy, read-time reconciliation idempotent:
  - `(user_id, week_key, event_type)` — a given week can only be consumed (or
    granted-against) once per user, so a repeated GET for the same historical
    week never double-consumes or double-grants.
  - `(user_id, milestone)` — a milestone can only ever grant once per user,
    even if `current_streak` is recomputed across multiple reads that all
    still read >= that milestone.
"""

from __future__ import annotations

from alembic import op

revision: str = "0085_streak_freeze_tables"
down_revision: str | None = "0084_dc_sync_outcome"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # ── streak_state ─────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE public.streak_state (
            user_id           uuid        NOT NULL PRIMARY KEY
                REFERENCES public.profiles(id) ON DELETE CASCADE,
            freezes_remaining smallint    NOT NULL DEFAULT 0
                CHECK (freezes_remaining BETWEEN 0 AND 2),
            updated_at        timestamptz NOT NULL DEFAULT now()
        )
    """)
    op.execute("""
        CREATE TRIGGER streak_state_updated_at
            BEFORE UPDATE ON public.streak_state
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()
    """)

    op.execute("ALTER TABLE public.streak_state ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE public.streak_state FORCE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY "streak_state_owner_select" ON public.streak_state FOR SELECT
            TO authenticated USING (user_id = auth.uid())
    """)
    op.execute("""
        CREATE POLICY "streak_state_owner_insert" ON public.streak_state FOR INSERT
            TO authenticated WITH CHECK (user_id = auth.uid())
    """)
    op.execute("""
        CREATE POLICY "streak_state_owner_update" ON public.streak_state FOR UPDATE
            TO authenticated
            USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())
    """)
    op.execute("GRANT SELECT, INSERT, UPDATE ON public.streak_state TO authenticated")
    op.execute("GRANT ALL ON public.streak_state TO service_role")

    # ── streak_freeze_events ─────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE public.streak_freeze_events (
            id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
            event_type  text        NOT NULL CHECK (event_type IN ('consumed', 'granted')),
            -- ISO date (Monday) of the week this event pertains to — for
            -- 'consumed', the week that was covered; for 'granted', the week
            -- the milestone was crossed.
            week_key    text        NOT NULL,
            -- Only set for 'granted' events; one of 4/8/12/26/52.
            milestone   smallint,
            created_at  timestamptz NOT NULL DEFAULT now(),
            UNIQUE (user_id, week_key, event_type),
            UNIQUE (user_id, milestone)
        )
    """)
    op.execute(
        "CREATE INDEX streak_freeze_events_user_id_idx "
        "ON public.streak_freeze_events (user_id, created_at DESC)"
    )

    op.execute("ALTER TABLE public.streak_freeze_events ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE public.streak_freeze_events FORCE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY "streak_freeze_events_owner_select" ON public.streak_freeze_events
            FOR SELECT TO authenticated USING (user_id = auth.uid())
    """)
    op.execute("""
        CREATE POLICY "streak_freeze_events_owner_insert" ON public.streak_freeze_events
            FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())
    """)
    op.execute("GRANT SELECT, INSERT ON public.streak_freeze_events TO authenticated")
    op.execute("GRANT ALL ON public.streak_freeze_events TO service_role")


def downgrade() -> None:
    op.execute("REVOKE ALL ON public.streak_freeze_events FROM authenticated")
    op.execute("REVOKE ALL ON public.streak_freeze_events FROM service_role")
    for p in ("streak_freeze_events_owner_insert", "streak_freeze_events_owner_select"):
        op.execute(f'DROP POLICY IF EXISTS "{p}" ON public.streak_freeze_events')
    op.execute("DROP INDEX IF EXISTS streak_freeze_events_user_id_idx")
    op.execute("DROP TABLE IF EXISTS public.streak_freeze_events")

    op.execute("REVOKE ALL ON public.streak_state FROM authenticated")
    op.execute("REVOKE ALL ON public.streak_state FROM service_role")
    for p in (
        "streak_state_owner_update",
        "streak_state_owner_insert",
        "streak_state_owner_select",
    ):
        op.execute(f'DROP POLICY IF EXISTS "{p}" ON public.streak_state')
    op.execute("DROP TRIGGER IF EXISTS streak_state_updated_at ON public.streak_state")
    op.execute("DROP TABLE IF EXISTS public.streak_state")
