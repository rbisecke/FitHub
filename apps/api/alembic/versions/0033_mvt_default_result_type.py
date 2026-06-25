"""Add default_result_type to movements.

Revision ID: 0033_mvt_default_result_type
Revises: a1a4d391c80a
Create Date: 2026-06-25
"""

from __future__ import annotations

from alembic import op

revision = "0033_mvt_default_result_type"
down_revision = "a1a4d391c80a"
branch_labels = None
depends_on = None

_VALID_TYPES = (
    "'weight'",
    "'reps'",
    "'time'",
    "'distance'",
    "'calories'",
    "'height'",
    "'rounds_reps'",
    "'watts'",
    "'pace'",
)
_CHECK = f"default_result_type IN ({', '.join(_VALID_TYPES)})"


def upgrade() -> None:
    op.execute(f"""
        ALTER TABLE public.movements
            ADD COLUMN default_result_type text
                CHECK ({_CHECK})
    """)

    op.execute("""
        GRANT UPDATE (default_result_type)
            ON public.movements TO authenticated
    """)


def downgrade() -> None:
    op.execute("""
        REVOKE UPDATE (default_result_type)
            ON public.movements FROM authenticated
    """)
    op.execute("ALTER TABLE public.movements DROP COLUMN default_result_type")
