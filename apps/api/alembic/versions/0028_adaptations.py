"""Adaptations table for plan adaptation tracking."""

from alembic import op

revision: str = "0028_adaptations"
down_revision: str = "0027_plan_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE adaptations (
            id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            plan_id      UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
            user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            trigger_type TEXT NOT NULL CHECK (trigger_type IN (
                             'high_acwr','low_readiness','missed_session',
                             'rpe_creep','active_injury','manual')),
            trigger_data JSONB NOT NULL DEFAULT '{}',
            proposed_at  TIMESTAMPTZ DEFAULT now(),
            status       TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN (
                             'proposed','merged','rejected','superseded')),
            rationale    TEXT,
            diff_json    JSONB,
            model        TEXT,
            stub         BOOLEAN DEFAULT false,
            merged_at    TIMESTAMPTZ,
            rejected_at  TIMESTAMPTZ
        )
    """)

    op.execute("ALTER TABLE adaptations ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY "owner access" ON adaptations
        USING (user_id = (SELECT auth.uid()))
    """)
    op.execute("""
        GRANT SELECT, INSERT, UPDATE, DELETE ON adaptations TO authenticated
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS adaptations")
