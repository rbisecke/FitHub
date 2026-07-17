"""Integration + unit tests for B2: _create_sessions / _create_items pairing correctness.

Before the fix, _create_sessions bulk-inserted session rows via executemany in
weeks_raw's iteration order (no enforced week_number sort), then re-SELECTed
ids `ORDER BY scheduled_date, id` and zipped them positionally against the
original items_list:

    [(row["id"], items_list[i]) for i, row in enumerate(rows)]

If insertion order wasn't already globally sorted by scheduled_date, this
silently paired a session's real DB id with the wrong week's items — no
exception, just corrupted data. `_create_sessions` and `_create_items` had
0% unit coverage before this PR. These tests deliberately scramble week
order and verify pairing by content (movement name / week), not row counts.
"""

from __future__ import annotations

from datetime import date
from unittest.mock import AsyncMock, MagicMock

import psycopg
import pytest

from app.ai.plan_generator import _create_items, _create_mesocycles, _create_sessions
from tests.conftest import ALICE_ID, TEST_DB_DSN

# ── Helpers ───────────────────────────────────────────────────────────────────


async def _insert_bare_plan(conn: psycopg.AsyncConnection[object], user_id: str) -> str:
    async with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            INSERT INTO plans (user_id, archetype, title, start_date, end_date,
                                branch_name, weeks, training_age, equipment, days_per_week)
            VALUES (%s, 'general-crossfit', 'B2 Test Plan', %s, %s, 'plan/b2-test', 4,
                    'intermediate', '{}'::TEXT[], 3)
            RETURNING id::text
            """,
            [user_id, date(2026, 8, 3), date(2026, 8, 24)],
        )
        row = await cur.fetchone()
    return row["id"]  # type: ignore[index]


def _week(week_num: int, movement: str) -> dict[str, object]:
    return {
        "week": week_num,
        "sessions": [
            {
                "day_offset": 0,
                "session_type": "strength",
                "title": f"Week {week_num} Session",
                "notes": None,
                "items": [
                    {
                        "movement_name": movement,
                        "sets": week_num,
                        "reps": "5",
                        "load_pct_1rm": None,
                        "load_kg": None,
                        "notes": None,
                    }
                ],
            }
        ],
    }


def _scrambled_weeks_raw() -> list[object]:
    """Three weeks of data, deliberately NOT in week-number order.

    week 1's scheduled_date < week 2's < week 3's, but the list is built as
    [week3, week1, week2] — insertion order does not match scheduled_date
    order, which is exactly the condition that exposed the old bug.
    """
    return [_week(3, "Week3 Movement"), _week(1, "Week1 Movement"), _week(2, "Week2 Movement")]


# ── Integration: real DB, content-based verification ────────────────────────


@pytest.mark.asyncio
async def test_create_sessions_pairs_items_by_source_week_not_insertion_order() -> None:
    """B2 regression: each session's items must match its own week, even when
    weeks are inserted out of scheduled_date order."""
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        user_id = str(ALICE_ID)
        plan_id = await _insert_bare_plan(conn, user_id)

        mesocycles_raw: list[object] = [
            {
                "name": "Block",
                "phase": "accumulation",
                "week_start": 1,
                "week_end": 3,
                "focus": None,
            }
        ]
        meso_id_map = await _create_mesocycles(plan_id, user_id, mesocycles_raw, conn)

        weeks_raw = _scrambled_weeks_raw()
        session_items = await _create_sessions(
            plan_id, user_id, date(2026, 8, 3), meso_id_map, weeks_raw, conn
        )
        assert len(session_items) == 3
        await _create_items(session_items, user_id, conn)

        # Query back and verify each session's scheduled_date corresponds to
        # the movement we put in its source week — a content-based check,
        # not just a row count.
        async with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            await cur.execute(
                "SELECT s.scheduled_date, i.movement_name, i.sets"
                " FROM planned_sessions s JOIN planned_items i ON i.session_id = s.id"
                " WHERE s.plan_id = %s ORDER BY s.scheduled_date",
                [plan_id],
            )
            rows = await cur.fetchall()

        assert len(rows) == 3
        expected = {
            date(2026, 8, 3): ("Week1 Movement", 1),
            date(2026, 8, 10): ("Week2 Movement", 2),
            date(2026, 8, 17): ("Week3 Movement", 3),
        }
        for row in rows:
            exp_name, exp_sets = expected[row["scheduled_date"]]
            assert row["movement_name"] == exp_name, (
                f"session on {row['scheduled_date']} has movement "
                f"{row['movement_name']!r}, expected {exp_name!r}"
            )
            assert row["sets"] == exp_sets


@pytest.mark.asyncio
async def test_create_sessions_multi_item_sessions_pair_correctly_when_scrambled() -> None:
    """Same scramble, but each week has multiple items — checks item_order too."""
    weeks_raw: list[object] = [
        {
            "week": 2,
            "sessions": [
                {
                    "day_offset": 0,
                    "session_type": "strength",
                    "title": "Week 2 Session",
                    "notes": None,
                    "items": [
                        {"movement_name": "Week2 First", "sets": 1, "reps": "5"},
                        {"movement_name": "Week2 Second", "sets": 2, "reps": "5"},
                    ],
                }
            ],
        },
        {
            "week": 1,
            "sessions": [
                {
                    "day_offset": 0,
                    "session_type": "strength",
                    "title": "Week 1 Session",
                    "notes": None,
                    "items": [
                        {"movement_name": "Week1 First", "sets": 1, "reps": "5"},
                        {"movement_name": "Week1 Second", "sets": 2, "reps": "5"},
                    ],
                }
            ],
        },
    ]

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        user_id = str(ALICE_ID)
        plan_id = await _insert_bare_plan(conn, user_id)
        mesocycles_raw: list[object] = [
            {
                "name": "Block",
                "phase": "accumulation",
                "week_start": 1,
                "week_end": 2,
                "focus": None,
            }
        ]
        meso_id_map = await _create_mesocycles(plan_id, user_id, mesocycles_raw, conn)

        session_items = await _create_sessions(
            plan_id, user_id, date(2026, 8, 3), meso_id_map, weeks_raw, conn
        )
        await _create_items(session_items, user_id, conn)

        async with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            await cur.execute(
                "SELECT s.scheduled_date, i.movement_name, i.item_order"
                " FROM planned_sessions s JOIN planned_items i ON i.session_id = s.id"
                " WHERE s.plan_id = %s ORDER BY s.scheduled_date, i.item_order",
                [plan_id],
            )
            rows = await cur.fetchall()

        week1_rows = [r for r in rows if r["scheduled_date"] == date(2026, 8, 3)]
        week2_rows = [r for r in rows if r["scheduled_date"] == date(2026, 8, 10)]
        assert [r["movement_name"] for r in week1_rows] == ["Week1 First", "Week1 Second"]
        assert [r["movement_name"] for r in week2_rows] == ["Week2 First", "Week2 Second"]


# ── Unit: pairing-by-construction holds without touching a real DB ──────────


@pytest.mark.asyncio
async def test_create_sessions_returns_ids_paired_with_source_items_no_db_readback() -> None:
    """_create_sessions must pair ids with items by construction, not via a
    post-insert SELECT — assert no SELECT is ever issued."""
    mock_cur = AsyncMock()
    mock_cur.__aenter__ = AsyncMock(return_value=mock_cur)
    mock_cur.__aexit__ = AsyncMock(return_value=False)
    mock_cur.executemany = AsyncMock()
    mock_cur.execute = AsyncMock()

    mock_conn = MagicMock()
    mock_conn.cursor = MagicMock(return_value=mock_cur)

    weeks_raw = _scrambled_weeks_raw()
    meso_id_map = {(1, 3): "meso-1"}

    session_items = await _create_sessions(
        "plan-1", "user-1", date(2026, 8, 3), meso_id_map, weeks_raw, mock_conn
    )

    # No SELECT/read-back at all — the old bug relied on one.
    mock_cur.execute.assert_not_called()
    mock_cur.executemany.assert_called_once()

    assert len(session_items) == 3
    movement_names = [items[0]["movement_name"] for _sid, items in session_items]  # type: ignore[index]
    assert movement_names == ["Week3 Movement", "Week1 Movement", "Week2 Movement"]
    # All session ids must be distinct real UUIDs.
    ids = [sid for sid, _items in session_items]
    assert len(set(ids)) == 3


def test_create_sessions_pairs_with_strict_zip() -> None:
    """The final session_ids/items_list pairing must use zip(..., strict=True),
    so a future refactor that decouples the two lists fails loudly instead of
    silently misaligning data (see B2)."""
    import inspect

    source = inspect.getsource(_create_sessions)
    assert "zip(session_ids, items_list, strict=True)" in source
