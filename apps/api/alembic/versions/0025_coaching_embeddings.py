"""Create coaching_embeddings table with HNSW + FTS indexes.

Revision ID: 0025_coaching_embeddings
Revises: 0024_coach_interactions
Create Date: 2026-06-20
"""

from __future__ import annotations

from alembic import op

revision: str = "0025_coaching_embeddings"
down_revision: str = "0024_coach_interactions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("""
        CREATE TABLE coaching_embeddings (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            source_type TEXT NOT NULL,
            title       TEXT NOT NULL,
            body        TEXT NOT NULL,
            embedding   vector(384),
            ts_vec      tsvector GENERATED ALWAYS AS (
                            to_tsvector('english', title || ' ' || body)
                        ) STORED,
            created_at  TIMESTAMPTZ DEFAULT now()
        )
    """)
    op.execute("""
        CREATE INDEX coaching_embeddings_hnsw ON coaching_embeddings
            USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64)
    """)
    op.execute("""
        CREATE INDEX coaching_embeddings_fts ON coaching_embeddings USING GIN (ts_vec)
    """)
    op.execute("ALTER TABLE coaching_embeddings ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY "authenticated read" ON coaching_embeddings
            FOR SELECT USING (auth.role() = 'authenticated')
    """)
    op.execute("""
        GRANT SELECT ON coaching_embeddings TO authenticated
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS coaching_embeddings CASCADE")
