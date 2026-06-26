"""Add variant_annotation column to results table.

Revision ID: 0041_add_variant_annotation
Revises: 0040_add_pinned_movements_table
Create Date: 2026-06-26

"""

from alembic import op

revision: str = "0041_add_variant_annotation"
down_revision: str | None = "0040_add_pinned_movements_table"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE public.results
          ADD COLUMN IF NOT EXISTS variant_annotation TEXT
    """)

    # Migrate any existing results that used the variant:* prefix in notes
    op.execute("""
        UPDATE public.results
           SET variant_annotation = REPLACE(notes, 'variant:', ''),
               notes = NULL
         WHERE notes LIKE 'variant:%'
    """)

    op.execute("""
        CREATE INDEX results_user_movement_variant_idx
            ON public.results (user_id, movement_id, variant_annotation)
            WHERE movement_id IS NOT NULL
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS results_user_movement_variant_idx")
    op.execute("ALTER TABLE public.results DROP COLUMN IF EXISTS variant_annotation")
