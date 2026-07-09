"""Add equipment_required column and GIN index to movements.

Revision ID: 0068_movements_equipment_required
Revises: 0067_planned_sessions_index
Create Date: 2026-07-09
"""

from alembic import op

revision = "0068_movements_equipment_required"
down_revision = "0067_planned_sessions_index"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE public.movements
            ADD COLUMN equipment_required TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]
        """
    )
    op.execute(
        "CREATE INDEX idx_movements_equipment_required"
        " ON public.movements USING GIN(equipment_required)"
    )
    op.execute("GRANT UPDATE (equipment_required) ON public.movements TO authenticated")
    op.execute("GRANT UPDATE (equipment_required) ON public.movements TO service_role")


def downgrade() -> None:
    op.execute("REVOKE UPDATE (equipment_required) ON public.movements FROM service_role")
    op.execute("REVOKE UPDATE (equipment_required) ON public.movements FROM authenticated")
    op.execute("DROP INDEX IF EXISTS idx_movements_equipment_required")
    op.execute("ALTER TABLE public.movements DROP COLUMN IF EXISTS equipment_required")
