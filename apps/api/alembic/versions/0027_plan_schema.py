"""Plan schema: plans, mesocycles, planned_sessions, planned_items, plan_tasks."""

from alembic import op

revision: str = "0027_plan_schema"
down_revision: str = "0026_wearable_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE plans (
            id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            goal         TEXT NOT NULL CHECK (goal IN (
                             'general_fitness','strength','endurance','competition_prep')),
            title        TEXT NOT NULL,
            start_date   DATE NOT NULL,
            end_date     DATE NOT NULL,
            status       TEXT NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active','archived','draft')),
            branch_name  TEXT NOT NULL,
            weeks        INT  NOT NULL CHECK (weeks BETWEEN 4 AND 24),
            training_age TEXT CHECK (training_age IN ('beginner','intermediate','advanced')),
            created_at   TIMESTAMPTZ DEFAULT now()
        )
    """)

    op.execute("""
        CREATE TABLE mesocycles (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            plan_id    UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
            user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            name       TEXT NOT NULL,
            phase      TEXT NOT NULL CHECK (phase IN (
                           'accumulation','intensification','deload','peak','test')),
            week_start INT  NOT NULL,
            week_end   INT  NOT NULL,
            focus      TEXT
        )
    """)

    op.execute("""
        CREATE TABLE planned_sessions (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            plan_id         UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
            mesocycle_id    UUID NOT NULL REFERENCES mesocycles(id) ON DELETE CASCADE,
            user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            scheduled_date  DATE NOT NULL,
            session_type    TEXT NOT NULL CHECK (session_type IN (
                                'strength','metcon','skill','mixed','rest','active_recovery')),
            title           TEXT NOT NULL,
            notes           TEXT,
            status          TEXT NOT NULL DEFAULT 'prescribed'
                                CHECK (status IN ('prescribed','completed','skipped','adapted'))
        )
    """)

    op.execute("""
        CREATE TABLE planned_items (
            id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id     UUID NOT NULL REFERENCES planned_sessions(id) ON DELETE CASCADE,
            user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            movement_name  TEXT NOT NULL,
            sets           INT,
            reps           TEXT,
            load_pct_1rm   NUMERIC(5,2),
            load_kg        NUMERIC(7,2),
            notes          TEXT,
            item_order     INT NOT NULL DEFAULT 0
        )
    """)

    op.execute("""
        CREATE TABLE plan_tasks (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            status     TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','running','complete','failed')),
            plan_id    UUID REFERENCES plans(id),
            error      TEXT,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        )
    """)

    # SECURITY DEFINER to break RLS cross-table recursion for planned_items
    op.execute("""
        CREATE OR REPLACE FUNCTION pi_owns_session(session_id uuid)
        RETURNS boolean
        LANGUAGE sql
        SECURITY DEFINER
        STABLE
        AS $$
            SELECT EXISTS (
                SELECT 1 FROM planned_sessions
                WHERE id = session_id AND user_id = (SELECT auth.uid())
            );
        $$
    """)

    # RLS
    op.execute("ALTER TABLE plans ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY "owner access" ON plans
        USING (user_id = (SELECT auth.uid()))
    """)

    op.execute("ALTER TABLE mesocycles ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY "owner access" ON mesocycles
        USING (user_id = (SELECT auth.uid()))
    """)

    op.execute("ALTER TABLE planned_sessions ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY "owner access" ON planned_sessions
        USING (user_id = (SELECT auth.uid()))
    """)

    op.execute("ALTER TABLE planned_items ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY "owner via session" ON planned_items
        USING (pi_owns_session(session_id))
    """)

    op.execute("ALTER TABLE plan_tasks ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY "owner access" ON plan_tasks
        USING (user_id = (SELECT auth.uid()))
    """)

    # GRANTs for authenticated role
    for table in ("plans", "mesocycles", "planned_sessions", "planned_items", "plan_tasks"):
        op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {table} TO authenticated")


def downgrade() -> None:
    for table in ("plans", "mesocycles", "planned_sessions", "planned_items", "plan_tasks"):
        op.execute(f"REVOKE ALL ON {table} FROM authenticated")

    op.execute('DROP POLICY IF EXISTS "owner access" ON plan_tasks')
    op.execute('DROP POLICY IF EXISTS "owner via session" ON planned_items')
    op.execute('DROP POLICY IF EXISTS "owner access" ON planned_sessions')
    op.execute('DROP POLICY IF EXISTS "owner access" ON mesocycles')
    op.execute('DROP POLICY IF EXISTS "owner access" ON plans')

    op.execute("DROP FUNCTION IF EXISTS pi_owns_session(uuid)")

    op.execute("DROP TABLE IF EXISTS plan_tasks")
    op.execute("DROP TABLE IF EXISTS planned_items")
    op.execute("DROP TABLE IF EXISTS planned_sessions")
    op.execute("DROP TABLE IF EXISTS mesocycles")
    op.execute("DROP TABLE IF EXISTS plans")
