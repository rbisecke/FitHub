"""Verify migration 0069: goal renamed to archetype, data migrated correctly."""

from __future__ import annotations

import psycopg
import pytest

TEST_DB_DSN = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

_VALID_ARCHETYPES = {
    "general-crossfit",
    "strength-bias",
    "travel-minimal",
    "aerobic-base",
    "bodyweight-calisthenics",
    "skill-acquisition",
    "one-rm-peak",
}


@pytest.fixture
def db_conn() -> psycopg.Connection:
    """Synchronous psycopg connection for migration verification queries."""
    with psycopg.connect(TEST_DB_DSN) as conn:
        yield conn


# -- Column existence ----------------------------------------------------------


def test_archetype_column_exists(db_conn: psycopg.Connection) -> None:
    """archetype column should be present and NOT NULL after upgrade."""
    row = db_conn.execute(
        """
        SELECT column_name, is_nullable
        FROM   information_schema.columns
        WHERE  table_schema = 'public'
          AND  table_name   = 'plans'
          AND  column_name  = 'archetype'
        """
    ).fetchone()
    assert row is not None, "archetype column missing from plans"
    assert row[1] == "NO", "archetype column should be NOT NULL"


def test_goal_column_absent(db_conn: psycopg.Connection) -> None:
    """goal column must have been dropped by the migration."""
    row = db_conn.execute(
        """
        SELECT column_name
        FROM   information_schema.columns
        WHERE  table_schema = 'public'
          AND  table_name   = 'plans'
          AND  column_name  = 'goal'
        """
    ).fetchone()
    assert row is None, "goal column still exists on plans after migration 0069"


# -- CHECK constraint ----------------------------------------------------------


def test_check_constraint_exists(db_conn: psycopg.Connection) -> None:
    """ck_plans_archetype CHECK constraint should be present on plans."""
    row = db_conn.execute(
        """
        SELECT constraint_name
        FROM   information_schema.table_constraints
        WHERE  table_schema    = 'public'
          AND  table_name      = 'plans'
          AND  constraint_name = 'ck_plans_archetype'
          AND  constraint_type = 'CHECK'
        """
    ).fetchone()
    assert row is not None, "ck_plans_archetype CHECK constraint missing from plans"


def test_check_constraint_rejects_invalid_archetype(
    db_conn: psycopg.Connection,
) -> None:
    """Inserting an invalid archetype value should raise a CheckViolation."""
    with pytest.raises(psycopg.errors.CheckViolation), db_conn.transaction():
        db_conn.execute(
            """
            INSERT INTO public.plans (user_id, archetype, title, start_date,
                                      end_date, weeks, branch_name)
            SELECT id, 'totally-made-up', 'Test Plan', CURRENT_DATE,
                   CURRENT_DATE + 28, 4, 'constraint-test'
            FROM   auth.users
            LIMIT  1
            """
        )


# -- Data integrity ------------------------------------------------------------


def test_no_null_archetypes(db_conn: psycopg.Connection) -> None:
    """No plan row should have a NULL archetype after the migration."""
    row = db_conn.execute("SELECT COUNT(*) FROM public.plans WHERE archetype IS NULL").fetchone()
    assert row[0] == 0, "Some plans have NULL archetype after migration 0069"


def test_all_existing_rows_have_valid_archetype(db_conn: psycopg.Connection) -> None:
    """Every archetype value in the table must be one of the 7 valid values."""
    rows = db_conn.execute("SELECT DISTINCT archetype FROM public.plans").fetchall()
    invalid = {r[0] for r in rows} - _VALID_ARCHETYPES
    assert not invalid, f"Plans with invalid archetypes after migration: {invalid}"


# -- Downgrade validation (structural check only) ------------------------------


def test_downgrade_precondition_archetype_present(
    db_conn: psycopg.Connection,
) -> None:
    """
    Structural smoke-test confirming upgrade ran: archetype column is present.

    Actual downgrade reversal is tested via `alembic downgrade -1` in the
    CI migration smoke-test step rather than here, to avoid breaking live DB
    state for the full test suite.
    """
    col = db_conn.execute(
        """
        SELECT column_name
        FROM   information_schema.columns
        WHERE  table_schema = 'public'
          AND  table_name   = 'plans'
          AND  column_name  = 'archetype'
        """
    ).fetchone()
    assert col is not None, "archetype column must exist -- upgrade must have run before this test"
