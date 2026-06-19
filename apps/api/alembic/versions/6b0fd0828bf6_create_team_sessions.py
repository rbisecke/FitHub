"""create_team_sessions

Revision ID: 6b0fd0828bf6
Revises: e3a91f64c820
Create Date: 2026-06-19

"""

from alembic import op

revision: str = "6b0fd0828bf6"
down_revision: str | None = "e3a91f64c820"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # ── team_sessions ────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE public.team_sessions (
            id              uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            created_by      uuid         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
            name            text,
            team_size       smallint     NOT NULL DEFAULT 2,
            scoring_type    text
                CHECK (scoring_type IN (
                    'for_time', 'amrap', 'total_reps',
                    'max_load', 'relay', 'slowest_finisher'
                )),
            team_score      text,
            team_score_s    integer,
            team_score_reps integer,
            status          text         NOT NULL DEFAULT 'completed'
                CHECK (status IN ('active', 'completed')),
            performed_at    timestamptz  NOT NULL,
            notes           text,
            created_at      timestamptz  NOT NULL DEFAULT now(),
            updated_at      timestamptz  NOT NULL DEFAULT now()
        )
    """)

    # ── team_session_participants ─────────────────────────────────────────────
    # Surrogate PK so guests (NULL user_id) can have multiple rows if needed.
    # UNIQUE NULLS NOT DISTINCT prevents the same user_id appearing twice.
    op.execute("""
        CREATE TABLE public.team_session_participants (
            id              uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            team_session_id uuid    NOT NULL REFERENCES public.team_sessions(id) ON DELETE CASCADE,
            user_id         uuid            REFERENCES public.profiles(id) ON DELETE SET NULL,
            workout_id      uuid            REFERENCES public.workouts(id) ON DELETE SET NULL,
            guest_name      text,
            role            text,
            joined_at       timestamptz NOT NULL DEFAULT now(),
            UNIQUE NULLS NOT DISTINCT (team_session_id, user_id),
            CHECK (user_id IS NOT NULL OR guest_name IS NOT NULL)
        )
    """)

    # Indexes — tsp_user_id_idx is critical for RLS subquery performance
    op.execute(
        "CREATE INDEX tsp_user_id_idx ON public.team_session_participants (user_id) "
        "WHERE user_id IS NOT NULL"
    )
    op.execute(
        "CREATE INDEX tsp_team_session_id_idx ON public.team_session_participants (team_session_id)"
    )
    op.execute(
        "CREATE INDEX tsp_workout_id_idx ON public.team_session_participants (workout_id) "
        "WHERE workout_id IS NOT NULL"
    )
    op.execute(
        "CREATE INDEX tsp_guest_name_idx ON public.team_session_participants (guest_name) "
        "WHERE guest_name IS NOT NULL"
    )

    # ── workouts.team_session_id FK ──────────────────────────────────────────
    op.execute("""
        ALTER TABLE public.workouts
            ADD COLUMN team_session_id uuid REFERENCES public.team_sessions(id) ON DELETE SET NULL
    """)
    op.execute(
        "CREATE INDEX workouts_team_session_idx ON public.workouts (team_session_id) "
        "WHERE team_session_id IS NOT NULL"
    )

    # ── notifications ────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE public.notifications (
            id          uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id     uuid         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
            type        text         NOT NULL
                CHECK (type IN (
                    'team_session_linked',
                    'team_session_updated',
                    'workout_link_pending'
                )),
            payload     jsonb        NOT NULL DEFAULT '{}',
            read_at     timestamptz,
            created_at  timestamptz  NOT NULL DEFAULT now()
        )
    """)
    op.execute(
        "CREATE INDEX notifications_user_unread_idx ON public.notifications "
        "(user_id, created_at DESC) WHERE read_at IS NULL"
    )

    # ── updated_at trigger for team_sessions ─────────────────────────────────
    op.execute("""
        CREATE TRIGGER team_sessions_updated_at
            BEFORE UPDATE ON public.team_sessions
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()
    """)

    # ── SECURITY DEFINER helpers — break RLS cross-table recursion ───────────
    # ts_select references team_session_participants; tsp_select references
    # team_sessions.  Without these helpers the two policies recurse infinitely.
    # Each function bypasses RLS on its target table (SECURITY DEFINER) so the
    # policies can call them without triggering each other.
    op.execute("""
        CREATE FUNCTION public.ts_is_participant(session_id uuid, uid uuid)
        RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
        SET search_path = public AS $$
            SELECT EXISTS (
                SELECT 1 FROM public.team_session_participants
                WHERE team_session_id = session_id AND user_id = uid
            )
        $$
    """)
    op.execute("""
        CREATE FUNCTION public.ts_can_see_session(session_id uuid, uid uuid)
        RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
        SET search_path = public AS $$
            SELECT EXISTS (
                SELECT 1 FROM public.team_sessions ts
                WHERE ts.id = session_id
                  AND (
                      ts.created_by = uid
                      OR EXISTS (
                          SELECT 1 FROM public.team_session_participants
                          WHERE team_session_id = session_id AND user_id = uid
                      )
                  )
            )
        $$
    """)

    # ── RLS: team_sessions ───────────────────────────────────────────────────
    op.execute("ALTER TABLE public.team_sessions ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE public.team_sessions FORCE ROW LEVEL SECURITY")

    # Uses ts_is_participant (SECURITY DEFINER) — no recursion with tsp_select.
    op.execute("""
        CREATE POLICY "ts_select" ON public.team_sessions FOR SELECT TO authenticated
        USING (created_by = auth.uid() OR public.ts_is_participant(id, auth.uid()))
    """)
    op.execute("""
        CREATE POLICY "ts_insert" ON public.team_sessions FOR INSERT TO authenticated
        WITH CHECK (created_by = auth.uid())
    """)
    op.execute("""
        CREATE POLICY "ts_update" ON public.team_sessions FOR UPDATE TO authenticated
        USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid())
    """)
    op.execute("""
        CREATE POLICY "ts_delete" ON public.team_sessions FOR DELETE TO authenticated
        USING (created_by = auth.uid())
    """)
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_sessions TO authenticated")
    op.execute("GRANT ALL ON public.team_sessions TO service_role")

    # ── RLS: team_session_participants ───────────────────────────────────────
    op.execute("ALTER TABLE public.team_session_participants ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE public.team_session_participants FORCE ROW LEVEL SECURITY")

    # Uses ts_can_see_session (SECURITY DEFINER) — no recursion with ts_select.
    op.execute("""
        CREATE POLICY "tsp_select" ON public.team_session_participants FOR SELECT TO authenticated
        USING (public.ts_can_see_session(team_session_id, auth.uid()))
    """)
    op.execute("""
        CREATE POLICY "tsp_insert" ON public.team_session_participants FOR INSERT TO authenticated
        WITH CHECK (
            team_session_id IN (
                SELECT id FROM public.team_sessions WHERE created_by = auth.uid()
            )
        )
    """)
    op.execute("""
        CREATE POLICY "tsp_update" ON public.team_session_participants FOR UPDATE TO authenticated
        USING (
            user_id = auth.uid()
            OR team_session_id IN (
                SELECT id FROM public.team_sessions WHERE created_by = auth.uid()
            )
        )
        WITH CHECK (
            user_id = auth.uid()
            OR team_session_id IN (
                SELECT id FROM public.team_sessions WHERE created_by = auth.uid()
            )
        )
    """)
    op.execute("""
        CREATE POLICY "tsp_delete" ON public.team_session_participants FOR DELETE TO authenticated
        USING (
            user_id = auth.uid()
            OR team_session_id IN (
                SELECT id FROM public.team_sessions WHERE created_by = auth.uid()
            )
        )
    """)
    op.execute(
        "GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_session_participants TO authenticated"
    )
    op.execute("GRANT ALL ON public.team_session_participants TO service_role")

    # ── RLS: notifications ────────────────────────────────────────────────────
    op.execute("ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY")

    op.execute("""
        CREATE POLICY "notif_select" ON public.notifications FOR SELECT TO authenticated
        USING (user_id = auth.uid())
    """)
    op.execute("""
        CREATE POLICY "notif_update" ON public.notifications FOR UPDATE TO authenticated
        USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())
    """)
    op.execute("GRANT SELECT, UPDATE ON public.notifications TO authenticated")
    op.execute("GRANT ALL ON public.notifications TO service_role")


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS team_sessions_updated_at ON public.team_sessions")

    # Drop notifications first (independent of team_sessions / participants).
    op.execute("REVOKE ALL ON public.notifications FROM authenticated")
    op.execute("REVOKE ALL ON public.notifications FROM service_role")
    op.execute("DROP POLICY IF EXISTS notif_update ON public.notifications")
    op.execute("DROP POLICY IF EXISTS notif_select ON public.notifications")
    op.execute("DROP TABLE IF EXISTS public.notifications")

    # Drop the workouts FK before removing team_sessions.
    op.execute("DROP INDEX IF EXISTS workouts_team_session_idx")
    op.execute("ALTER TABLE public.workouts DROP COLUMN IF EXISTS team_session_id")

    # Drop ALL team_sessions policies first — ts_select has a subquery that
    # references team_session_participants, creating a cross-table dependency.
    # Postgres refuses to drop team_session_participants while that policy exists.
    op.execute("REVOKE ALL ON public.team_sessions FROM authenticated")
    op.execute("REVOKE ALL ON public.team_sessions FROM service_role")
    for p in ("ts_delete", "ts_update", "ts_insert", "ts_select"):
        op.execute(f"DROP POLICY IF EXISTS {p} ON public.team_sessions")

    # Now safe to drop team_session_participants (no dependent policy remains).
    op.execute("REVOKE ALL ON public.team_session_participants FROM authenticated")
    op.execute("REVOKE ALL ON public.team_session_participants FROM service_role")
    for p in ("tsp_delete", "tsp_update", "tsp_insert", "tsp_select"):
        op.execute(f"DROP POLICY IF EXISTS {p} ON public.team_session_participants")
    for idx in (
        "tsp_guest_name_idx",
        "tsp_workout_id_idx",
        "tsp_team_session_id_idx",
        "tsp_user_id_idx",
    ):
        op.execute(f"DROP INDEX IF EXISTS {idx}")
    op.execute("DROP TABLE IF EXISTS public.team_session_participants")

    # Finally drop team_sessions (no policies left, no FK from participants).
    op.execute("DROP TABLE IF EXISTS public.team_sessions")

    # Drop SECURITY DEFINER helpers after their dependent policies are gone.
    op.execute("DROP FUNCTION IF EXISTS public.ts_can_see_session(uuid, uuid)")
    op.execute("DROP FUNCTION IF EXISTS public.ts_is_participant(uuid, uuid)")
