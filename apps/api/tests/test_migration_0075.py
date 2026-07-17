"""Verify migration 0075: drop redundant plans column-grants, add equipment tag CHECK."""

from __future__ import annotations

import psycopg
import pytest

TEST_DB_DSN = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

_REVOKED_COLUMNS = (
    "equipment",
    "days_per_week",
    "target_movement_id",
    "max_duration_weeks",
    "current_1rm_kg",
)


@pytest.fixture
def db_conn() -> psycopg.Connection:
    """Synchronous psycopg connection for migration verification queries."""
    with psycopg.connect(TEST_DB_DSN) as conn:
        yield conn


# ── DB1: redundant column-level grants revoked ─────────────────────────────────


def test_column_level_acl_cleared_on_plans(db_conn: psycopg.Connection) -> None:
    """
    The five columns 0071 granted column-level INSERT/UPDATE on should have no
    column-specific ACL entries left after this migration's REVOKE — attacl
    falls back to NULL (inherit from the table-level grant) once the only
    entries on it (the ones 0071 added) are removed.
    """
    rows = db_conn.execute(
        """
        SELECT attname, attacl
        FROM   pg_attribute a
        JOIN   pg_class c ON a.attrelid = c.oid
        WHERE  c.relname = 'plans'
          AND  attname = ANY(%s)
        """,
        [list(_REVOKED_COLUMNS)],
    ).fetchall()
    assert len(rows) == 5, f"Expected 5 matching columns on plans, found {len(rows)}"
    for attname, attacl in rows:
        assert attacl is None, (
            f"plans.{attname} still has a column-specific ACL after migration 0075: {attacl}"
        )


def test_blanket_table_grants_on_plans_still_intact(db_conn: psycopg.Connection) -> None:
    """
    Revoking the redundant column-level grants must not touch the blanket
    table-level GRANT SELECT, INSERT, UPDATE, DELETE that 0027 (authenticated)
    and 0063 (service_role) put on plans -- real write access is unaffected.
    """
    for role in ("authenticated", "service_role"):
        for priv in ("SELECT", "INSERT", "UPDATE", "DELETE"):
            row = db_conn.execute(
                "SELECT has_table_privilege(%s, 'public.plans', %s)",
                [role, priv],
            ).fetchone()
            assert row[0] is True, f"{role} lost table-level {priv} on public.plans"


# ── DB2: equipment_required tag CHECK constraint ────────────────────────────────


def test_equipment_check_constraint_exists(db_conn: psycopg.Connection) -> None:
    """equipment_required_valid_tags CHECK constraint should be present on movements."""
    row = db_conn.execute(
        """
        SELECT constraint_name
        FROM   information_schema.table_constraints
        WHERE  table_schema    = 'public'
          AND  table_name      = 'movements'
          AND  constraint_name = 'equipment_required_valid_tags'
          AND  constraint_type = 'CHECK'
        """
    ).fetchone()
    assert row is not None, "equipment_required_valid_tags CHECK constraint missing from movements"


def _any_movement_id(db_conn: psycopg.Connection) -> str:
    """Pick an arbitrary existing movement id, skipping if the catalog is empty.

    Uses an id lookup rather than a hardcoded name (e.g. 'Back Squat') because
    the local catalog seed doesn't guarantee every canonical movement name is
    present -- test_migration_0068's equivalent tests hit the same issue and
    skip for the same reason.
    """
    row = db_conn.execute("SELECT id FROM public.movements LIMIT 1").fetchone()
    if row is None:
        pytest.skip("movements table is empty -- catalog seed data not applied yet")
    return row[0]


def test_check_constraint_rejects_invalid_tag(db_conn: psycopg.Connection) -> None:
    """A direct UPDATE writing a tag outside VALID_TAGS must be rejected."""
    movement_id = _any_movement_id(db_conn)
    with pytest.raises(psycopg.errors.CheckViolation), db_conn.transaction():
        db_conn.execute(
            "UPDATE public.movements SET equipment_required = %s WHERE id = %s",
            [["not-a-real-tag"], movement_id],
        )


def test_check_constraint_accepts_valid_tags(db_conn: psycopg.Connection) -> None:
    """A normal, valid equipment-tag write must still succeed."""
    movement_id = _any_movement_id(db_conn)
    original = db_conn.execute(
        "SELECT equipment_required FROM public.movements WHERE id = %s", [movement_id]
    ).fetchone()
    original_value = original[0]
    try:
        db_conn.execute(
            "UPDATE public.movements SET equipment_required = %s WHERE id = %s",
            [["barbell", "rack"], movement_id],
        )
        row = db_conn.execute(
            "SELECT equipment_required FROM public.movements WHERE id = %s", [movement_id]
        ).fetchone()
        assert row[0] == ["barbell", "rack"]
    finally:
        db_conn.execute(
            "UPDATE public.movements SET equipment_required = %s WHERE id = %s",
            [original_value, movement_id],
        )
        db_conn.commit()


def test_existing_rows_satisfy_check_constraint(db_conn: psycopg.Connection) -> None:
    """No existing row should violate the new CHECK (default '{}' is trivially valid)."""
    row = db_conn.execute(
        """
        SELECT COUNT(*)
        FROM   public.movements
        WHERE  NOT (
            equipment_required <@ ARRAY[
                'barbell', 'rack', 'dumbbells', 'kettlebell', 'pull_up_bar',
                'rings', 'rower', 'bike', 'ski', 'bodyweight', 'jump_rope',
                'resistance_band'
            ]::TEXT[]
        )
        """
    ).fetchone()
    assert row[0] == 0, "Some movements rows carry a tag outside VALID_TAGS after migration 0075"


# ── Downgrade validation (offline -- structural check only) ────────────────────


def test_downgrade_precondition_check_constraint_present(
    db_conn: psycopg.Connection,
) -> None:
    """
    Structural smoke-test confirming upgrade ran: the CHECK constraint is present.

    Actual downgrade reversal (DROP CONSTRAINT, re-GRANT) is exercised via
    `alembic downgrade -1` / `upgrade head` in the CI migration smoke-test step
    rather than here, to avoid mutating live DB state for the full test suite.
    """
    row = db_conn.execute(
        """
        SELECT constraint_name
        FROM   information_schema.table_constraints
        WHERE  table_schema    = 'public'
          AND  table_name      = 'movements'
          AND  constraint_name = 'equipment_required_valid_tags'
        """
    ).fetchone()
    assert row is not None, "equipment_required_valid_tags must exist -- upgrade must have run"
