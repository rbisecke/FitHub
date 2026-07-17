"""Regression tests for the fallback-tier truncation bug.

Root cause: tier 2's (deterministic_substitution) and tier 3's (static_fallback)
fallback builders in _call_llm both sliced FALLBACK_SESSIONS' "weeks" list to
`[:1]` and hardcoded `week_number=1` when constructing their PlanFill. Any plan
that fell through to tier 2 or tier 3 was therefore silently truncated to a
single week regardless of how many weeks the user requested — plan_tasks.status
still reported "complete", with no error and no warning surfaced to the caller.
_plan_fill_to_draft only ever emits entries for weeks actually present in
plan_fill.weeks, and _create_plan_records' only defensive check was whether
total sessions was zero — neither caught "only 1/N weeks have any sessions".

The fix tiles each fallback template's single representative week across
every week in the scaffold (see _tile_template_weeks / _fallback_plan_fill in
app/ai/plan_generator.py) instead of slicing to the first week only. This
module proves multi-week plans generated under tier 2 and tier 3 now actually
persist sessions for every requested week.

Also covers:
  - the new _create_plan_records safeguard that fails loudly (plan_task ->
    'failed') if a draft ever schedules fewer weeks than requested again, and
  - the LLM_BACKEND model-routing fix (plan generation previously ignored
    LLM_BACKEND/OLLAMA_MODEL/OPENAI_MODEL, always resolving to a hardcoded
    Anthropic model id via ARCHETYPE_MODEL regardless of configured backend).
"""

from __future__ import annotations

import random
import uuid
from datetime import date
from typing import Any
from unittest.mock import MagicMock, patch

import psycopg
import psycopg.rows
import pytest
from httpx import AsyncClient

from app.ai.archetype_prompts import ARCHETYPE_MODEL
from app.ai.movement_enum import ExerciseSelection, PlanFill, SessionFill, WeekFill
from app.ai.plan_generator import _call_llm, _plan_fill_to_draft, run_plan_generation
from app.ai.plan_scaffold import build_scaffold
from app.models.plan import CreatePlanRequest
from tests.conftest import ALICE_ID, TEST_DB_DSN

WEEKS = 8
DAYS_PER_WEEK = 3  # matches every FALLBACK_SESSIONS template's 3-session week
START_DATE = date(2026, 8, 4)

# ── Helpers ───────────────────────────────────────────────────────────────────


def _req_data(**overrides: object) -> dict[str, object]:
    base: dict[str, object] = {
        "archetype": "general-crossfit",
        "title": "Fallback Truncation Regression",
        "start_date": START_DATE.isoformat(),
        "weeks": WEEKS,
        "training_age": "intermediate",
        "equipment": [],
        "days_per_week": DAYS_PER_WEEK,
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
            "SELECT status, plan_id, generation_tier, error FROM plan_tasks WHERE id = %s",
            [task_id],
        )
        row = await cur.fetchone()
    assert row is not None
    return row


async def _fetch_scheduled_weeks(plan_id: str, start_date: date) -> dict[int, int]:
    """Return {week_number: session_count} for every planned_sessions row,
    computed the same way run_plan_generation's _create_sessions scheduled them
    (start_date + timedelta(weeks=week_num - 1, days=day_offset))."""
    async with (
        await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn,
        conn.cursor(row_factory=psycopg.rows.dict_row) as cur,
    ):
        await cur.execute(
            "SELECT scheduled_date FROM planned_sessions WHERE plan_id = %s",
            [plan_id],
        )
        rows = await cur.fetchall()
    counts: dict[int, int] = {}
    for row in rows:
        week_num = (row["scheduled_date"] - start_date).days // 7 + 1
        counts[week_num] = counts.get(week_num, 0) + 1
    return counts


def _fake_llm_always_fails() -> MagicMock:
    """A fake instructor client whose create() always raises (forces tier 1 to fail)."""

    def _raise_create(**kwargs: Any) -> Any:  # noqa: ANN401
        raise RuntimeError("simulated tier1 failure")

    fake = MagicMock()
    fake.client.chat.completions.create = _raise_create
    return fake


async def _fake_movements_single_squat_variant(
    conn: object, equipment: list[str]
) -> list[dict[str, object]]:
    """A single custom movement absent from every fallback template, forcing
    tier 2's substitution loop to actually call random.choice()."""
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


async def _truncated_draft(*args: object, **kwargs: object) -> dict[str, object]:
    """A stand-in for assemble_plan() that reproduces the pre-fix truncation
    shape directly: only week 1 populated, regardless of the requested weeks."""
    return {
        "mesocycles": [
            {
                "name": "Block",
                "phase": "accumulation",
                "week_start": 1,
                "week_end": WEEKS,
                "focus": None,
            }
        ],
        "weeks": [
            {
                "week": 1,
                "sessions": [
                    {
                        "day_offset": 0,
                        "session_type": "strength",
                        "title": "Day 1",
                        "intensity_level": "hard",
                        "items": [
                            {
                                "movement_name": "Air Squat",
                                "sets": 3,
                                "reps": "10",
                                "load_pct_1rm": None,
                                "load_kg": None,
                                "movement_pattern": "squat",
                                "notes": None,
                            }
                        ],
                        "notes": None,
                    }
                ],
            }
        ],
    }


def _fake_llm_client(model: str, backend: str, captured: dict[str, object]) -> MagicMock:
    """A fake instructor client that succeeds immediately (tier 1) and records
    the `model=` kwarg it was called with."""

    def _fake_create(**kwargs: Any) -> Any:  # noqa: ANN401
        captured.update(kwargs)

        async def _coro() -> PlanFill:
            exercises = [
                ExerciseSelection(movement_name="Air Squat", sets=2, reps_or_duration="10")
                for _ in range(3)
            ]
            sessions = [SessionFill(session_type="strength", exercises=exercises) for _ in range(3)]
            week_fills = [WeekFill(week_number=wn, sessions=sessions) for wn in range(1, WEEKS + 1)]
            return PlanFill(archetype="general-crossfit", weeks=week_fills)

        return _coro()

    fake = MagicMock()
    fake.client.chat.completions.create = _fake_create
    fake.backend = backend
    fake.model = model
    return fake


# ── Critical regression: tier 2/3 must cover every requested week ────────────


@pytest.mark.asyncio
async def test_tier2_deterministic_substitution_covers_all_requested_weeks(
    monkeypatch: pytest.MonkeyPatch, alice_client: AsyncClient
) -> None:
    """Pre-fix, tier 2's fallback builder sliced FALLBACK_SESSIONS to `[:1]`,
    so an 8-week request that fell through to tier 2 only ever persisted
    week 1 while plan_tasks.status still reported "complete"."""
    monkeypatch.setenv("STUB_LLM", "false")
    task_id = await _insert_plan_task(ALICE_ID)

    fake_llm = _fake_llm_always_fails()
    with patch("app.ai.client.get_client", return_value=fake_llm):
        await run_plan_generation(task_id, str(ALICE_ID), _req_data())

    row = await _fetch_plan_task(task_id)
    assert row["status"] == "complete", row.get("error")
    assert row["generation_tier"] == "deterministic_substitution"

    weeks_covered = await _fetch_scheduled_weeks(row["plan_id"], START_DATE)
    assert set(weeks_covered.keys()) == set(range(1, WEEKS + 1)), (
        f"expected all {WEEKS} weeks scheduled, got {sorted(weeks_covered.keys())}"
    )
    total_sessions = sum(weeks_covered.values())
    assert total_sessions == WEEKS * DAYS_PER_WEEK, (
        f"expected {WEEKS * DAYS_PER_WEEK} sessions, got {total_sessions}"
    )


@pytest.mark.asyncio
async def test_tier3_static_fallback_covers_all_requested_weeks(
    monkeypatch: pytest.MonkeyPatch, alice_client: AsyncClient
) -> None:
    """Pre-fix, tier 3's static fallback builder also sliced FALLBACK_SESSIONS
    to `[:1]` — the last-resort path was truncated exactly like tier 2."""
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
    assert row["status"] == "complete", row.get("error")
    assert row["generation_tier"] == "static_fallback"

    weeks_covered = await _fetch_scheduled_weeks(row["plan_id"], START_DATE)
    assert set(weeks_covered.keys()) == set(range(1, WEEKS + 1)), (
        f"expected all {WEEKS} weeks scheduled, got {sorted(weeks_covered.keys())}"
    )
    total_sessions = sum(weeks_covered.values())
    assert total_sessions == WEEKS * DAYS_PER_WEEK, (
        f"expected {WEEKS * DAYS_PER_WEEK} sessions, got {total_sessions}"
    )


# ── Safeguard: a future truncation regression must fail loudly ──────────────


@pytest.mark.asyncio
async def test_safeguard_fails_loudly_on_truncated_draft(
    monkeypatch: pytest.MonkeyPatch, alice_client: AsyncClient
) -> None:
    """If a future bug reintroduces truncation upstream of _create_plan_records,
    persistence must fail loudly (plan_task -> 'failed') instead of silently
    persisting an incomplete plan that looks structurally fine."""
    monkeypatch.setenv("STUB_LLM", "false")
    task_id = await _insert_plan_task(ALICE_ID)

    with patch("app.ai.plan_generator.assemble_plan", _truncated_draft):
        await run_plan_generation(task_id, str(ALICE_ID), _req_data())

    row = await _fetch_plan_task(task_id)
    assert row["status"] == "failed"
    assert row["plan_id"] is None
    # A client-safe message was recorded (see run_plan_generation's exception
    # handler), not the raw internal ValueError text from _create_plan_records —
    # raw exception messages must never reach the client (see CLAUDE.md).
    assert row["error"] == "Plan generation failed. Please try again."

    task_resp = await alice_client.get(f"/api/v1/plans/tasks/{task_id}")
    assert task_resp.json()["status"] == "failed"


@pytest.mark.asyncio
async def test_safeguard_uses_scaffold_target_weeks_for_skill_acquisition(
    monkeypatch: pytest.MonkeyPatch, alice_client: AsyncClient
) -> None:
    """MEDIUM regression: for archetype == "skill-acquisition", build_scaffold
    targets max_duration_weeks (not weeks) as the real week count (see
    plan_scaffold.build_scaffold), and CreatePlanRequest allows the two fields
    to legitimately diverge. A request with weeks=12, max_duration_weeks=8
    correctly produces an 8-week plan.

    Before the fix, the truncation safeguard compared the persisted week count
    against the raw req_data["weeks"] (12) instead of the scaffold's actual
    8-week target, so this valid 8-week plan was incorrectly rejected and the
    plan_task wrongly marked 'failed'.
    """
    monkeypatch.setenv("STUB_LLM", "false")

    async with (
        await psycopg.AsyncConnection.connect(TEST_DB_DSN) as conn,
        conn.cursor(row_factory=psycopg.rows.dict_row) as cur,
    ):
        await cur.execute("SELECT id::text FROM public.movements WHERE slug = 'bar-muscle-up'")
        movement_row = await cur.fetchone()
    assert movement_row is not None, (
        "local seed data must include a 'Bar Muscle-Up' movement (slug 'bar-muscle-up') "
        "for this test — see supabase/seed.sql"
    )
    movement_id = movement_row["id"]

    req_data = _req_data(
        archetype="skill-acquisition",
        weeks=12,
        max_duration_weeks=8,
        target_movement_id=movement_id,
    )
    scaffold = build_scaffold(CreatePlanRequest(**req_data))
    assert scaffold.total_weeks == 8, "scaffold must target max_duration_weeks, not weeks"

    def _fake_plan_fill() -> PlanFill:
        exercises = [
            ExerciseSelection(movement_name="Air Squat", sets=2, reps_or_duration="10")
            for _ in range(3)
        ]
        week_fills = [
            WeekFill(
                week_number=w.week_number,
                sessions=[
                    SessionFill(session_type=s.session_type, exercises=exercises)
                    for s in w.sessions
                ],
            )
            for w in scaffold.weeks
        ]
        return PlanFill(archetype="skill-acquisition", weeks=week_fills)

    async def _fake_assemble_plan(*args: object, **kwargs: object) -> dict[str, object]:
        return _plan_fill_to_draft(_fake_plan_fill(), scaffold)

    task_id = await _insert_plan_task(ALICE_ID)
    with patch("app.ai.plan_generator.assemble_plan", _fake_assemble_plan):
        await run_plan_generation(task_id, str(ALICE_ID), req_data)

    row = await _fetch_plan_task(task_id)
    assert row["status"] == "complete", row.get("error")

    weeks_covered = await _fetch_scheduled_weeks(row["plan_id"], START_DATE)
    assert set(weeks_covered.keys()) == set(range(1, 9)), (
        f"expected weeks 1-8 scheduled (max_duration_weeks target), got "
        f"{sorted(weeks_covered.keys())}"
    )


# ── Model routing: LLM_BACKEND must be respected, default behavior unchanged ─


@pytest.mark.asyncio
async def test_model_routing_keeps_archetype_routing_for_default_anthropic_backend() -> None:
    """LLM_BACKEND=anthropic (the default) must keep ARCHETYPE_MODEL's
    per-archetype Haiku/Sonnet cost routing byte-identical to before this fix
    — this is the proof the model-routing fix does not change production
    (default) behavior."""
    req = CreatePlanRequest(
        archetype="general-crossfit",
        title="Model Routing Test",
        start_date=START_DATE,
        weeks=WEEKS,
        training_age="intermediate",
        equipment=[],
        days_per_week=DAYS_PER_WEEK,
    )
    scaffold = build_scaffold(req)
    captured: dict[str, object] = {}
    fake_llm = _fake_llm_client(model="should-not-be-used", backend="anthropic", captured=captured)

    with patch("app.ai.client.get_client", return_value=fake_llm):
        await _call_llm(req, scaffold, [], {})

    assert captured["model"] == ARCHETYPE_MODEL["general-crossfit"]


@pytest.mark.asyncio
async def test_model_routing_uses_resolved_model_for_non_anthropic_backend() -> None:
    """A non-default LLM_BACKEND (e.g. ollama) must use the model client.py
    already resolved from OLLAMA_MODEL, not ARCHETYPE_MODEL's hardcoded
    Anthropic model ids — this was the bug: overriding LLM_BACKEND for local
    dev/testing/cost reasons was silently ignored specifically for plan
    generation."""
    req = CreatePlanRequest(
        archetype="general-crossfit",
        title="Model Routing Test",
        start_date=START_DATE,
        weeks=WEEKS,
        training_age="intermediate",
        equipment=[],
        days_per_week=DAYS_PER_WEEK,
    )
    scaffold = build_scaffold(req)
    captured: dict[str, object] = {}
    fake_llm = _fake_llm_client(model="mistral:7b", backend="ollama", captured=captured)

    with patch("app.ai.client.get_client", return_value=fake_llm):
        await _call_llm(req, scaffold, [], {})

    assert captured["model"] == "mistral:7b"
    assert captured["model"] != ARCHETYPE_MODEL["general-crossfit"]
