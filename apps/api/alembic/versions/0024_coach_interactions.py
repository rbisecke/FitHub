"""Create coach_interactions table.

Revision ID: 0024_coach_interactions
Revises: 101db758acaa
Create Date: 2026-06-20
"""

from __future__ import annotations

from alembic import op

revision: str = "0024_coach_interactions"
down_revision: str = "101db758acaa"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE coach_interactions (
            id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            session_id    UUID,
            role          TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
            content       TEXT NOT NULL,
            model         TEXT,
            input_tokens  INT,
            output_tokens INT,
            stub          BOOLEAN DEFAULT false,
            created_at    TIMESTAMPTZ DEFAULT now()
        )
    """)
    op.execute("ALTER TABLE coach_interactions ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY "owner access" ON coach_interactions
            USING (user_id = (SELECT auth.uid()))
    """)
    op.execute("""
        GRANT SELECT, INSERT, UPDATE, DELETE ON coach_interactions TO authenticated
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS coach_interactions CASCADE")
