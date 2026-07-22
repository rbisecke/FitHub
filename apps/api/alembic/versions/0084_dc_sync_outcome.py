"""Persist the last Apple Health sync's outcome on data_connections.

Revision ID: 0084_dc_sync_outcome
Revises: 0083_tsp_guest_unique_fix
Create Date: 2026-07-22

The `/apple-health/sync` handler has always computed `rows_inserted` and
`recovery_computed` for its response, but never wrote either anywhere — so
the source-detail screen (Domain 07 §C) had nothing durable to show for
"what did the last sync actually do." This adds three nullable columns:

- `last_sync_rows_inserted` — the last sync's row count.
- `last_sync_recovery_computed` — whether recovery recompute succeeded
  (best-effort and swallowed on failure by the ingest handler; `false` is a
  quiet informational state, never an error, per the design spec).
- `last_sync_error` — set only for the two failure classes that can be
  attributed to an already-verified connection (413 payload too large, 400
  invalid JSON) so the detail screen can translate them to plain language.
  A 401 invalid-token failure is deliberately NOT tracked here: regenerating
  a token mints a brand-new prefix+hash, so a stale bearer from an
  un-updated HAE config never matches any current row's prefix, and there
  would be nothing legitimate to attribute the failure to.
"""

from __future__ import annotations

from alembic import op

revision = "0084_dc_sync_outcome"
down_revision = "0083_tsp_guest_unique_fix"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE public.data_connections
            ADD COLUMN last_sync_rows_inserted INTEGER,
            ADD COLUMN last_sync_recovery_computed BOOLEAN,
            ADD COLUMN last_sync_error TEXT
                CHECK (last_sync_error IN ('payload_too_large', 'invalid_json'))
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE public.data_connections
            DROP COLUMN IF EXISTS last_sync_rows_inserted,
            DROP COLUMN IF EXISTS last_sync_recovery_computed,
            DROP COLUMN IF EXISTS last_sync_error
        """
    )
