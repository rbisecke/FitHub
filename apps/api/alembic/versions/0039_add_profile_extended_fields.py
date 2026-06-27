"""Add extended fields to profiles.

New columns: bio, location, box_affiliation, distance_unit,
training_level, training_since, avatar_url.

Revision ID: 0039_add_profile_extended_fields
Revises: 0038_add_is_tag
Create Date: 2026-06-26

"""

from alembic import op

revision: str = "0039_add_profile_extended_fields"
down_revision: str | None = "0038_add_is_tag"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE public.profiles
          ADD COLUMN IF NOT EXISTS bio             TEXT CHECK (char_length(bio) <= 160),
          ADD COLUMN IF NOT EXISTS location        TEXT,
          ADD COLUMN IF NOT EXISTS box_affiliation TEXT,
          ADD COLUMN IF NOT EXISTS distance_unit   TEXT NOT NULL DEFAULT 'km'
            CHECK (distance_unit IN ('km', 'mi')),
          ADD COLUMN IF NOT EXISTS training_level  TEXT
            CHECK (training_level IN (
                'recreational', 'intermediate', 'competitive', 'masters', 'elite'
            )),
          ADD COLUMN IF NOT EXISTS training_since  DATE,
          ADD COLUMN IF NOT EXISTS avatar_url      TEXT
    """)

    # Grant UPDATE on new columns to authenticated role
    op.execute("""
        GRANT UPDATE(
            bio, location, box_affiliation, distance_unit,
            training_level, training_since, avatar_url
        ) ON public.profiles TO authenticated
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE public.profiles DROP COLUMN IF EXISTS avatar_url")
    op.execute("ALTER TABLE public.profiles DROP COLUMN IF EXISTS training_since")
    op.execute("ALTER TABLE public.profiles DROP COLUMN IF EXISTS training_level")
    op.execute("ALTER TABLE public.profiles DROP COLUMN IF EXISTS distance_unit")
    op.execute("ALTER TABLE public.profiles DROP COLUMN IF EXISTS box_affiliation")
    op.execute("ALTER TABLE public.profiles DROP COLUMN IF EXISTS location")
    op.execute("ALTER TABLE public.profiles DROP COLUMN IF EXISTS bio")
