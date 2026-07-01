"""Tests for POST /api/v1/coach/modify-workout and union_contraindications engine helper."""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient

from app.engine.injury import union_contraindications

# ---------------------------------------------------------------------------
# Engine unit tests
# ---------------------------------------------------------------------------


class TestUnionContraindications:
    def test_empty_injuries_returns_empty(self) -> None:
        assert union_contraindications([]) == {}

    def test_single_injury_maps_movements(self) -> None:
        result = union_contraindications([("hamstring", False)])
        assert "deadlift" in result
        assert "hamstring" in result["deadlift"]

    def test_two_injuries_blocking_same_movement(self) -> None:
        result = union_contraindications([("hamstring", False), ("lower_back", False)])
        assert "deadlift" in result
        assert "hamstring" in result["deadlift"]
        assert "lower_back" in result["deadlift"]

    def test_referral_injury_included_in_block(self) -> None:
        result = union_contraindications([("knee", True)])
        assert "air_squat" in result
        assert "knee" in result["air_squat"]

    def test_unknown_region_contributes_nothing(self) -> None:
        result = union_contraindications([("alien_limb", False)])
        assert result == {}

    def test_driven_by_lists_all_blocking_regions(self) -> None:
        result = union_contraindications([("shoulder", False), ("elbow", False)])
        assert "muscle_up" in result
        assert set(result["muscle_up"]) >= {"shoulder", "elbow"}


# ---------------------------------------------------------------------------
# Integration tests — POST /api/v1/coach/modify-workout
# ---------------------------------------------------------------------------


async def _create_plan_with_session(client: AsyncClient, movements: list[str]) -> str:
    """Create a minimal plan + session via the plans API and return the session_id."""
    r = await client.post(
        "/api/v1/plans",
        json={
            "goal": "test",
            "weeks": 1,
            "days_per_week": 1,
            "training_level": "beginner",
        },
    )
    if r.status_code != 200:
        pytest.skip("Plan creation failed — AI not available in this environment")
    plan_id = r.json()["id"]

    # Fetch the auto-generated session
    r2 = await client.get(f"/api/v1/plans/{plan_id}")
    if r2.status_code != 200:
        pytest.skip("Plan detail fetch failed")
    sessions = r2.json().get("sessions", [])
    if not sessions:
        pytest.skip("No sessions generated")
    return str(sessions[0]["id"])


async def _create_session_with_items(client: AsyncClient, movements: list[str]) -> tuple[str, str]:
    """Insert a plan + session + items directly via DB helpers and return (plan_id, session_id)."""
    import psycopg

    from tests.conftest import ALICE_ID, TEST_DB_DSN

    plan_id = str(uuid.uuid4())
    session_id = str(uuid.uuid4())

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        from datetime import date as _date
        from datetime import timedelta

        _today = _date.today()
        await conn.execute(
            """
            INSERT INTO plans
                (id, user_id, goal, title, weeks, status, start_date, end_date, branch_name)
            VALUES (%s, %s, 'strength', 'Test plan', 4, 'active', %s, %s, 'test-plan')
            """,
            [plan_id, str(ALICE_ID), _today, _today + timedelta(weeks=4)],
        )
        meso_id = str(uuid.uuid4())
        await conn.execute(
            """
            INSERT INTO mesocycles (id, plan_id, user_id, name, phase, week_start, week_end)
            VALUES (%s, %s, %s, 'Block 1', 'accumulation', 1, 1)
            """,
            [meso_id, plan_id, str(ALICE_ID)],
        )
        from datetime import date

        await conn.execute(
            """
            INSERT INTO planned_sessions
                (id, plan_id, mesocycle_id, user_id, scheduled_date, session_type, title)
            VALUES (%s, %s, %s, %s, %s, 'strength', 'Test session')
            """,
            [session_id, plan_id, meso_id, str(ALICE_ID), date.today()],
        )
        for i, mv in enumerate(movements):
            await conn.execute(
                """
                INSERT INTO planned_items (session_id, user_id, movement_name, item_order)
                VALUES (%s, %s, %s, %s)
                """,
                [session_id, str(ALICE_ID), mv, i],
            )

    return plan_id, session_id


@pytest.mark.asyncio
async def test_modify_workout_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.post(
        "/api/v1/coach/modify-workout",
        json={"session_id": str(uuid.uuid4())},
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_modify_workout_unknown_session_404(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/coach/modify-workout",
        json={"session_id": str(uuid.uuid4())},
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_modify_workout_idor_prevention(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    _, session_id = await _create_session_with_items(alice_client, ["deadlift"])
    r = await bob_client.post(
        "/api/v1/coach/modify-workout",
        json={"session_id": session_id},
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_modify_workout_no_injuries_all_safe(alice_client: AsyncClient) -> None:
    _, session_id = await _create_session_with_items(alice_client, ["deadlift", "air_squat"])
    r = await alice_client.post(
        "/api/v1/coach/modify-workout",
        json={"session_id": session_id},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["modifications"] == []
    assert set(data["safe_movements"]) == {"deadlift", "air_squat"}
    assert data["any_referral_required"] is False


@pytest.mark.asyncio
async def test_modify_workout_with_hamstring_injury(alice_client: AsyncClient) -> None:
    # Report a hamstring injury (no red flags)
    await alice_client.post(
        "/api/v1/injuries",
        json={"body_region": "hamstring", "pain_level": 5, "notes": "tightness"},
    )
    _, session_id = await _create_session_with_items(
        alice_client, ["deadlift", "air_squat", "sprint"]
    )
    r = await alice_client.post(
        "/api/v1/coach/modify-workout",
        json={"session_id": session_id},
    )
    assert r.status_code == 200
    data = r.json()
    blocked = {m["original_movement"] for m in data["modifications"]}
    assert "deadlift" in blocked
    assert "sprint" in blocked
    assert "air_squat" in data["safe_movements"]
    assert data["any_referral_required"] is False
    # deadlift should have substitutions from the curated dict
    deadlift_mod = next(m for m in data["modifications"] if m["original_movement"] == "deadlift")
    assert len(deadlift_mod["substitutions"]) > 0
    assert deadlift_mod["confidence"] == "curated"


@pytest.mark.asyncio
async def test_modify_workout_referral_injury_flagged(alice_client: AsyncClient) -> None:
    # Report a high-pain injury that requires referral
    await alice_client.post(
        "/api/v1/injuries",
        json={"body_region": "knee", "pain_level": 9},
    )
    _, session_id = await _create_session_with_items(alice_client, ["air_squat"])
    r = await alice_client.post(
        "/api/v1/coach/modify-workout",
        json={"session_id": session_id},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["any_referral_required"] is True
    assert "knee" in data["referral_regions"]


@pytest.mark.asyncio
async def test_modify_workout_driven_by_lists_regions(alice_client: AsyncClient) -> None:
    # Two injuries both blocking deadlift (hamstring + lower_back)
    await alice_client.post(
        "/api/v1/injuries",
        json={"body_region": "hamstring", "pain_level": 4},
    )
    await alice_client.post(
        "/api/v1/injuries",
        json={"body_region": "lower_back", "pain_level": 3},
    )
    _, session_id = await _create_session_with_items(alice_client, ["deadlift"])
    r = await alice_client.post(
        "/api/v1/coach/modify-workout",
        json={"session_id": session_id},
    )
    assert r.status_code == 200
    mods = r.json()["modifications"]
    assert len(mods) == 1
    driven_by = set(mods[0]["driven_by"])
    assert "hamstring" in driven_by
    assert "lower_back" in driven_by
