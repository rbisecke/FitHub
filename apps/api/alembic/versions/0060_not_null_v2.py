"""add NOT NULL to plan_tasks timestamps, coach_sessions.updated_at, wearable columns

Revision ID: 0060_not_null_v2
Revises: 0059_add_indexes_v2
Create Date: 2026-07-07
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision: str = "0060_not_null_v2"
down_revision: str = "0059_add_indexes_v2"
branch_labels = None
depends_on = None

_COLS = [
    ("plan_tasks", "created_at"),
    ("plan_tasks", "updated_at"),
    ("coach_sessions", "updated_at"),
    ("data_connections", "created_at"),
    ("metric_samples", "created_at"),
    ("derived_metrics", "computed_at"),
    ("coaching_embeddings", "created_at"),
]


def upgrade() -> None:
    bind = op.get_bind()
    for table, col in _COLS:
        result = bind.execute(sa.text(f"SELECT COUNT(*) FROM public.{table} WHERE {col} IS NULL"))
        count = result.scalar()
        if count > 0:
            raise RuntimeError(f"Cannot add NOT NULL: {count} rows have NULL in {table}.{col}")
        op.execute(f"ALTER TABLE public.{table} ALTER COLUMN {col} SET NOT NULL")


def downgrade() -> None:
    for table, col in reversed(_COLS):
        op.execute(f"ALTER TABLE public.{table} ALTER COLUMN {col} DROP NOT NULL")
