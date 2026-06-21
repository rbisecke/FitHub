"""Injuries table for injury train-around system."""

from alembic import op

revision: str = "0029_injuries"
down_revision: str = "0028_adaptations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE injuries (
            id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            body_region       TEXT NOT NULL CHECK (body_region IN (
                                  'shoulder','knee','hip','lower_back',
                                  'wrist','elbow','ankle','neck','other')),
            pain_level        INT NOT NULL CHECK (pain_level BETWEEN 0 AND 10),
            mechanism         TEXT CHECK (mechanism IN ('overuse','acute','unknown')),
            notes             TEXT,
            active            BOOLEAN NOT NULL DEFAULT true,
            requires_referral BOOLEAN NOT NULL DEFAULT false,
            reported_at       TIMESTAMPTZ DEFAULT now(),
            resolved_at       TIMESTAMPTZ
        )
    """)

    op.execute("ALTER TABLE injuries ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY "owner access" ON injuries
        USING (user_id = (SELECT auth.uid()))
    """)
    op.execute("""
        GRANT SELECT, INSERT, UPDATE, DELETE ON injuries TO authenticated
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS injuries")
