"""Integration tests for AI3 (generation tier persisted/surfaced) and B5 (plan
corrections persisted/surfaced), migration 0073_plan_generation_tier.

These exercise the real run_plan_generation orchestration with STUB_LLM=false
(not the stub path) so each of the three generation tiers actually resolves
and its plan_tasks row / API response can be checked end to end — matching
this repo's established lesson that STUB_LLM=true skips the exact code path
a bug lives in (see PR-A's cross-cutting note in
DESIGN-programming-flexibility.html).

Tier resolution is forced deterministically rather than relying on a real
LLM being unavailable:
  - Tier 1 (ai): the mocked instructor client succeeds on the first call.
  - Tier 2 (deterministic_substitution): the mocked instructor client always
    raises, so tier 1 fails; tier 2's substitution logic then runs for real
    against the live movement catalog and succeeds (it has safe fallbacks
    for every input, so it practically never fails on its own).
  - Tier 3 (static_fallback): tier 1 is forced to fail as above, and tier 2
    is also forced to fail by making its one fallible call (random.choice,
    reached because the equipment filter is patched to return a custom
    movement whose name isn't in any fallback template) raise.

These tests go through the real _create_plan_records (no stand-in) — including
its scaffold-derived mesocycle rows, which are frequently single-week blocks
(e.g. an isolated deload week). That used to violate ck_mesocycles_week_range
(`week_end > week_start`, added independently in migration 0061) for
essentially every archetype/weeks/training_age combination, since STUB_LLM=true
always short-circuits assemble_plan before build_scaffold's real mesocycles are
used, so the two code paths were never exercised together against a live DB.
Migration 0074 relaxed the constraint to `week_end >= week_start` to fix this;
these tests (weeks=4, intermediate — which produces single-week
intensification and deload blocks, see plan_scaffold.py) are this repo's
end-to-end proof that real plan generation now completes successfully.

B5's "a real correction happened" case wraps the real validate_and_correct_plan
with a synthetic extra violation rather than trying to trigger the MRV clamp
through the full LLM pipeline: _plan_fill_to_draft always writes
movement_pattern=None for LLM-authored items (the scaffold, not the LLM,
owns movement_pattern), and _clamp_sets_to_mrv's per-item mutation loop
matches on the literal pattern string — so an LLM-pipeline-produced plan can
never actually trigger a real reduction today. That gap is also pre-existing
and outside AI3/B5/B3/B4's scope; this test instead verifies the *wiring*
(does run_plan_generation correctly persist and surface whatever violations
validate_and_correct_plan reports), which is what B5 is actually about. The
MRV-clamp math itself is already exhaustively covered in
tests/unit/test_validate_plan.py.
"""

from __future__ import annotations

import random
import uuid
from datetime import date
from typing import Any
from unittest.mock import MagicMock, patch

import psycopg
import pytest
from httpx import AsyncClient

from app.ai.movement_enum import ExerciseSelection, PlanFill, SessionFill, WeekFill
from app.ai.plan_generator import run_plan_generation
from app.ai.plan_generator import validate_and_correct_plan as _real_validate_and_correct_plan
from app.engine.programming import PlanValidationError
from tests.conftest import ALICE_ID, TEST_DB_DSN

# ── Helpers ───────────────────────────────────────────────────────────────────


def _req_data(**overrides: object) -> dict[str, object]:
    base: dict[str, object] = {
        "archetype": "general-crossfit",
        "title": "AI3/B5 Transparency Test",
        "start_date": date(2026, 8, 4).isoformat(),
        "weeks": 4,
        "training_age": "intermediate",
        "equipment": [],
        "days_per_week": 3,
        "target_movement_id": None,
        "max_duration_weeks": None,
        "current_1rm_kg": None,
    }
    base.update(overrides)
    return base


async def _insert_plan_task(user_id: uuid.UUID) -> str:
    task_id = str(uuid.uuid4())
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await conn.execute(
            "INSERT INTO plan_tasks (id, user_id, status) VALUES (%s::uuid, %s, 'pending')",
            [task_id, str(user_id)],
        )
    return task_id


async def _fetch_plan_task(task_id: str) -> dict[str, Any]:
    async with (
        await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn,
        conn.cursor(row_factory=psycopg.rows.dict_row) as cur,
    ):
        await cur.execute(
            "SELECT status, plan_id, generation_tier, corrections FROM plan_tasks WHERE id = %s",
            [task_id],
        )
        row = await cur.fetchone()
    assert row is not None
    return row


async def _fetch_mesocycles(plan_id: str) -> list[dict[str, Any]]:
    async with (
        await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn,
        conn.cursor(row_factory=psycopg.rows.dict_row) as cur,
    ):
        await cur.execute(
            "SELECT phase, week_start, week_end FROM mesocycles"
            " WHERE plan_id = %s ORDER BY week_start",
            [plan_id],
        )
        return list(await cur.fetchall())


def _fake_llm_success(plan_fill: PlanFill) -> MagicMock:
    """A fake instructor client whose create() succeeds immediately (tier 1)."""

    def _fake_create(**kwargs: Any) -> Any:  # noqa: ANN401
        async def _coro() -> PlanFill:
            return plan_fill

        return _coro()

    fake = MagicMock()
    fake.client.chat.completions.create = _fake_create
    return fake


def _fake_llm_always_fails() -> MagicMock:
    """A fake instructor client whose create() always raises (forces tier 1 to fail)."""

    def _raise_create(**kwargs: Any) -> Any:  # noqa: ANN401
        raise RuntimeError("simulated tier1 failure")

    fake = MagicMock()
    fake.client.chat.completions.create = _raise_create
    return fake


def _small_plan_fill(archetype: str = "general-crossfit", sets: int = 2) -> PlanFill:
    """A modest, valid PlanFill spanning 4 weeks x 3 sessions x 3 exercises.

    `sets` is kept low enough (<=2) that no pattern crosses the intermediate
    MRV (20) across a 3-session week, so this never accidentally triggers a
    real MRV-clamp correction — see the module docstring for why.
    """
    exercises = [
        ExerciseSelection(movement_name="Air Squat", sets=sets, reps_or_duration="10")
        for _ in range(3)
    ]
    sessions = [SessionFill(session_type="strength", exercises=exercises) for _ in range(3)]
    weeks = [WeekFill(week_number=wn, sessions=sessions) for wn in range(1, 5)]
    return PlanFill(archetype=archetype, weeks=weeks)


async def _fake_movements_single_squat_variant(
    conn: object, user_id: str, equipment: list[str]
) -> list[dict[str, object]]:
    """A single custom movement that doesn't match any fallback template's
    movement names, so tier 2's substitution loop is forced to actually call
    random.choice() (which the tier-3 test then makes raise)."""
    return [
        {
            "id": str(uuid.uuid4()),
            "name": "Zzz Custom Squat Variant",
            "movement_pattern": "squat",
            "equipment_required": [],
        }
    ]


def _raise_choice(seq: object) -> object:
    raise RuntimeError("simulated tier2 failure")


# ── AI3: generation_tier ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_generation_tier_ai_on_tier1_success(
    monkeypatch: pytest.MonkeyPatch, alice_client: AsyncClient
) -> None:
    monkeypatch.setenv("STUB_LLM", "false")
    task_id = await _insert_plan_task(ALICE_ID)

    fake_llm = _fake_llm_success(_small_plan_fill())
    with patch("app.ai.client.get_client", return_value=fake_llm):
        await run_plan_generation(task_id, str(ALICE_ID), _req_data())

    row = await _fetch_plan_task(task_id)
    assert row["status"] == "complete"
    assert row["generation_tier"] == "ai"

    task_resp = await alice_client.get(f"/api/v1/plans/tasks/{task_id}")
    assert task_resp.status_code == 200
    assert task_resp.json()["generation_tier"] == "ai"

    plan_resp = await alice_client.get(f"/api/v1/plans/{row['plan_id']}")
    assert plan_resp.status_code == 200
    assert plan_resp.json()["generation_tier"] == "ai"

    # The end-to-end proof for the mesocycle single-week fix (migration 0074):
    # weeks=4/intermediate produces an isolated single-week intensification
    # block and an isolated single-week deload block (see plan_scaffold.py),
    # and both were persisted successfully — pre-fix, this INSERT violated
    # ck_mesocycles_week_range and run_plan_generation would have caught the
    # exception and marked the task 'failed' instead of 'complete'.
    mesocycles = await _fetch_mesocycles(row["plan_id"])
    assert mesocycles, "expected mesocycles to be persisted"
    single_week = [m for m in mesocycles if m["week_end"] == m["week_start"]]
    assert single_week, (
        f"expected at least one single-week mesocycle for weeks=4/intermediate, got {mesocycles}"
    )


@pytest.mark.asyncio
async def test_generation_tier_deterministic_substitution_on_tier1_failure(
    monkeypatch: pytest.MonkeyPatch, alice_client: AsyncClient
) -> None:
    monkeypatch.setenv("STUB_LLM", "false")
    task_id = await _insert_plan_task(ALICE_ID)

    fake_llm = _fake_llm_always_fails()
    with patch("app.ai.client.get_client", return_value=fake_llm):
        await run_plan_generation(task_id, str(ALICE_ID), _req_data())

    row = await _fetch_plan_task(task_id)
    assert row["status"] == "complete"
    assert row["generation_tier"] == "deterministic_substitution"

    task_resp = await alice_client.get(f"/api/v1/plans/tasks/{task_id}")
    assert task_resp.json()["generation_tier"] == "deterministic_substitution"

    plan_resp = await alice_client.get(f"/api/v1/plans/{row['plan_id']}")
    assert plan_resp.json()["generation_tier"] == "deterministic_substitution"


@pytest.mark.asyncio
async def test_generation_tier_static_fallback_when_tier1_and_tier2_fail(
    monkeypatch: pytest.MonkeyPatch, alice_client: AsyncClient
) -> None:
    monkeypatch.setenv("STUB_LLM", "false")
    task_id = await _insert_plan_task(ALICE_ID)

    fake_llm = _fake_llm_always_fails()
    with (
        patch("app.ai.client.get_client", return_value=fake_llm),
        patch(
            "app.ai.plan_generator.get_equipment_filtered_movements",
            _fake_movements_single_squat_variant,
        ),
        patch.object(random, "choice", _raise_choice),
    ):
        await run_plan_generation(task_id, str(ALICE_ID), _req_data())

    row = await _fetch_plan_task(task_id)
    assert row["status"] == "complete"
    assert row["generation_tier"] == "static_fallback"

    task_resp = await alice_client.get(f"/api/v1/plans/tasks/{task_id}")
    assert task_resp.json()["generation_tier"] == "static_fallback"

    plan_resp = await alice_client.get(f"/api/v1/plans/{row['plan_id']}")
    assert plan_resp.json()["generation_tier"] == "static_fallback"


@pytest.mark.asyncio
async def test_generation_tier_null_in_stub_mode(alice_client: AsyncClient) -> None:
    """STUB_LLM=true (this repo's default test mode) never reaches _call_llm,
    so generation_tier must stay NULL rather than being guessed at."""
    task_id = await _insert_plan_task(ALICE_ID)

    await run_plan_generation(task_id, str(ALICE_ID), _req_data())

    row = await _fetch_plan_task(task_id)
    assert row["status"] == "complete"
    assert row["generation_tier"] is None

    task_resp = await alice_client.get(f"/api/v1/plans/tasks/{task_id}")
    assert task_resp.json()["generation_tier"] is None


# ── B5: corrections ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_corrections_empty_when_no_violation(
    monkeypatch: pytest.MonkeyPatch, alice_client: AsyncClient
) -> None:
    monkeypatch.setenv("STUB_LLM", "false")
    task_id = await _insert_plan_task(ALICE_ID)

    fake_llm = _fake_llm_success(_small_plan_fill())
    with patch("app.ai.client.get_client", return_value=fake_llm):
        await run_plan_generation(task_id, str(ALICE_ID), _req_data())

    row = await _fetch_plan_task(task_id)
    assert row["status"] == "complete"
    assert row["corrections"] == []

    task_resp = await alice_client.get(f"/api/v1/plans/tasks/{task_id}")
    assert task_resp.json()["corrections"] == []

    plan_resp = await alice_client.get(f"/api/v1/plans/{row['plan_id']}")
    assert plan_resp.json()["corrections"] == []


@pytest.mark.asyncio
async def test_corrections_surfaced_when_a_real_violation_occurs(
    monkeypatch: pytest.MonkeyPatch, alice_client: AsyncClient
) -> None:
    """Wiring test: whatever validate_and_correct_plan reports must reach both
    plan_tasks.corrections and the API response, unmodified. See the module
    docstring for why this wraps the real function with a synthetic extra
    violation instead of trying to force an MRV clamp through the LLM path.
    """
    monkeypatch.setenv("STUB_LLM", "false")
    task_id = await _insert_plan_task(ALICE_ID)

    injected_message = "Week 1: squat sets 30 > MRV 20; scaled down"

    def _vcp_with_injected_violation(
        plan: dict[str, object], training_age: str, scaffold: object
    ) -> tuple[dict[str, object], list[PlanValidationError]]:
        corrected, violations = _real_validate_and_correct_plan(plan, training_age, scaffold)  # type: ignore[arg-type]
        return corrected, [
            *violations,
            PlanValidationError(code="sets_clamped", message=injected_message, week=1),
        ]

    fake_llm = _fake_llm_success(_small_plan_fill())
    with (
        patch("app.ai.client.get_client", return_value=fake_llm),
        patch("app.ai.plan_generator.validate_and_correct_plan", _vcp_with_injected_violation),
    ):
        await run_plan_generation(task_id, str(ALICE_ID), _req_data())

    row = await _fetch_plan_task(task_id)
    assert row["status"] == "complete"
    assert row["corrections"] == [injected_message]

    task_resp = await alice_client.get(f"/api/v1/plans/tasks/{task_id}")
    assert task_resp.json()["corrections"] == [injected_message]

    plan_resp = await alice_client.get(f"/api/v1/plans/{row['plan_id']}")
    assert plan_resp.json()["corrections"] == [injected_message]
