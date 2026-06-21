"""Add per-chunk metadata columns to coaching_embeddings.

Revision ID: 0031_coaching_embeddings_metadata
Revises: 0030_service_role_grants
Create Date: 2026-06-20
"""

from alembic import op

revision: str = "0031_embeddings_meta"
down_revision: str = "0030_service_role_grants"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE coaching_embeddings
            ADD COLUMN IF NOT EXISTS source_file     TEXT,
            ADD COLUMN IF NOT EXISTS source_url      TEXT,
            ADD COLUMN IF NOT EXISTS file_hash       TEXT,
            ADD COLUMN IF NOT EXISTS embedding_model TEXT,
            ADD COLUMN IF NOT EXISTS section_path    TEXT,
            ADD COLUMN IF NOT EXISTS chunk_index     INT,
            ADD COLUMN IF NOT EXISTS language        TEXT DEFAULT 'en'
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS coaching_embeddings_source_file
            ON coaching_embeddings (source_file)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS coaching_embeddings_file_hash
            ON coaching_embeddings (file_hash)
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS coaching_embeddings_file_hash")
    op.execute("DROP INDEX IF EXISTS coaching_embeddings_source_file")
    op.execute("""
        ALTER TABLE coaching_embeddings
            DROP COLUMN IF EXISTS source_file,
            DROP COLUMN IF EXISTS source_url,
            DROP COLUMN IF EXISTS file_hash,
            DROP COLUMN IF EXISTS embedding_model,
            DROP COLUMN IF EXISTS section_path,
            DROP COLUMN IF EXISTS chunk_index,
            DROP COLUMN IF EXISTS language
    """)
