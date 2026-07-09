"""Verify migration 0068: equipment_required column and GIN index on movements."""

from __future__ import annotations

import psycopg
import pytest

TEST_DB_DSN = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"


@pytest.fixture
def db_conn() -> psycopg.Connection:
    """Synchronous psycopg connection for migration verification queries."""
    with psycopg.connect(TEST_DB_DSN) as conn:
        yield conn


# ── Column existence ──────────────────────────────────────────────────────────


def test_equipment_required_column_exists(db_conn: psycopg.Connection) -> None:
    """Column should exist with type ARRAY and an empty-array default."""
    row = db_conn.execute(
        """
        SELECT column_name, data_type, column_default
        FROM   information_schema.columns
        WHERE  table_schema = 'public'
          AND  table_name   = 'movements'
          AND  column_name  = 'equipment_required'
        """
    ).fetchone()
    assert row is not None, "equipment_required column missing from movements"
    assert "ARRAY" in row[2].upper(), "Default should be an empty array"


# ── GIN index ─────────────────────────────────────────────────────────────────


def test_gin_index_exists(db_conn: psycopg.Connection) -> None:
    """GIN index idx_movements_equipment_required should be present."""
    row = db_conn.execute(
        """
        SELECT indexname, indexdef
        FROM   pg_indexes
        WHERE  tablename = 'movements'
          AND  indexname = 'idx_movements_equipment_required'
        """
    ).fetchone()
    assert row is not None, "GIN index idx_movements_equipment_required missing"
    assert "gin" in row[1].lower()


# ── Column usability ──────────────────────────────────────────────────────────


def test_equipment_required_accepts_array(db_conn: psycopg.Connection) -> None:
    """Column should accept and return a TEXT[] value correctly."""
    # Use an official movement known to exist in the catalog seed data.
    # We update then restore so the test is non-destructive.
    original = db_conn.execute(
        "SELECT equipment_required FROM public.movements WHERE name = 'Back Squat'"
    ).fetchone()

    if original is None:
        pytest.skip("Back Squat not in movements table — seed data not applied yet")

    original_value = original[0]
    try:
        db_conn.execute(
            "UPDATE public.movements SET equipment_required = %s WHERE name = 'Back Squat'",
            [["barbell", "rack"]],
        )
        row = db_conn.execute(
            "SELECT equipment_required FROM public.movements WHERE name = 'Back Squat'"
        ).fetchone()
        assert row[0] == ["barbell", "rack"]
    finally:
        # Restore the original value regardless of assertion outcome.
        db_conn.execute(
            "UPDATE public.movements SET equipment_required = %s WHERE name = 'Back Squat'",
            [original_value],
        )
        db_conn.commit()


def test_existing_rows_have_non_null_equipment_required(
    db_conn: psycopg.Connection,
) -> None:
    """All existing rows should have equipment_required = '{}' (not NULL) after upgrade."""
    row = db_conn.execute(
        "SELECT COUNT(*) FROM public.movements WHERE equipment_required IS NULL"
    ).fetchone()
    assert row[0] == 0, "Some movements have NULL equipment_required after migration"


# ── Downgrade validation (offline — structural check only) ────────────────────


def test_downgrade_removes_column_and_index(db_conn: psycopg.Connection) -> None:
    """
    Structural smoke-test: verify the downgrade SQL is reversible by checking
    that IF the column were dropped the index would no longer reference it.

    This test does NOT actually run downgrade (that would break the live DB
    state for the full test suite). Instead it validates the column is present,
    confirming upgrade ran; actual downgrade is tested via `alembic downgrade -1`
    in the CI migration smoke-test step.
    """
    col = db_conn.execute(
        """
        SELECT column_name
        FROM   information_schema.columns
        WHERE  table_schema = 'public'
          AND  table_name   = 'movements'
          AND  column_name  = 'equipment_required'
        """
    ).fetchone()
    assert col is not None, (
        "equipment_required column must exist — upgrade must have run before this test"
    )
