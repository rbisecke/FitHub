"""Regression tests for C2: shared mutable plan-correction fixtures.

Before the fix, `_RECOVERY_PLACEHOLDER` and `_PADDING_SESSION` were shared
module-level dicts. `_enforce_session_count` appended the *same* padding
session (and therefore the same recovery-placeholder item) into every plan
it padded; `_clamp_sets_to_mrv` then mutated `item["sets"]` in place on that
shared object. The result: one plan generation permanently corrupted the
fixture for every subsequent plan generated in the same process — including,
via `@stubbed(STUB_PLAN)` handing back the fixture object itself (not a
copy), the shared `STUB_PLAN` test fixture across an entire pytest run.

These tests reproduce that corruption against the pre-fix code (see the
`git stash` verification in the PR) and assert it no longer happens.
"""

from __future__ import annotations

import copy

import pytest

from app.ai.plan_generator import STUB_PLAN, assemble_plan
from app.models.plan import PlanScaffold, SessionSlot, WeekSlot

# ── Helpers ───────────────────────────────────────────────────────────────────


def _make_scaffold_needing_padding() -> PlanScaffold:
    """A 1-week scaffold expecting 2 sessions, so the plan below pads by one."""
    week_slot = WeekSlot(
        week_number=1,
        phase="accumulation",
        sessions=[
            SessionSlot(day_of_week=0, session_type="strength", intensity_hint="hard"),
            SessionSlot(day_of_week=1, session_type="strength", intensity_hint="hard"),
        ],
        target_volume_sets={},
        target_intensity_pct=None,
    )
    return PlanScaffold(
        archetype="general-crossfit",
        total_weeks=1,
        mesocycles=[],
        weeks=[week_slot],
        deload_weeks=set(),
        target_movement_id=None,
        equipment_tags=[],
    )


def _make_plan_triggering_padding_and_clamp() -> dict[str, object]:
    """A plan with only 1 session (of 2 expected) whose existing squat volume

    is already over the "beginner" MRV (14 sets) — so once the padding
    session's placeholder item (3 more squat sets) is added,
    _clamp_sets_to_mrv scales every squat-pattern item's `sets` down,
    including the padding placeholder's.
    """
    return {
        "mesocycles": [],
        "weeks": [
            {
                "week": 1,
                "sessions": [
                    {
                        "day_offset": 0,
                        "session_type": "strength",
                        "title": "Heavy Squat Day",
                        "intensity_level": "hard",
                        "items": [
                            {
                                "movement_name": "Back Squat",
                                "sets": 20,
                                "reps": "5",
                                "load_pct_1rm": 80.0,
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


# ── C2: module-level fixtures must never be mutated ────────────────────────────


def test_validate_and_correct_plan_never_mutates_shared_placeholders() -> None:
    """Reproduces the exact corruption: two calls must not touch the module fixtures.

    This test fails on pre-fix code — the second call's padding session shares
    _RECOVERY_PLACEHOLDER by reference, and _clamp_sets_to_mrv mutates its
    "sets" key in place, permanently changing the module-level dict.
    """
    from app.ai import plan_generator as pg

    original_placeholder = copy.deepcopy(pg._RECOVERY_PLACEHOLDER)
    original_padding = copy.deepcopy(pg._PADDING_SESSION)

    scaffold = _make_scaffold_needing_padding()
    plan_a = _make_plan_triggering_padding_and_clamp()
    plan_b = _make_plan_triggering_padding_and_clamp()

    corrected_a, errors_a = pg.validate_and_correct_plan(plan_a, "beginner", scaffold)
    assert any(e.code == "sessions_padded" for e in errors_a)
    assert any(e.code == "sets_clamped" for e in errors_a)

    corrected_b, errors_b = pg.validate_and_correct_plan(plan_b, "beginner", scaffold)
    assert any(e.code == "sessions_padded" for e in errors_b)

    # The module-level templates must be byte-identical before and after both calls.
    assert original_placeholder == pg._RECOVERY_PLACEHOLDER
    assert original_padding == pg._PADDING_SESSION

    # And the two corrected plans' padding sessions must be independent objects,
    # not the same shared dict/list.
    padding_a = corrected_a["weeks"][0]["sessions"][1]  # type: ignore[index]
    padding_b = corrected_b["weeks"][0]["sessions"][1]  # type: ignore[index]
    assert padding_a is not padding_b
    assert padding_a["items"] is not padding_b["items"]  # type: ignore[index]


def test_validate_and_correct_plan_does_not_mutate_input_plan() -> None:
    """validate_and_correct_plan must deep-copy `plan` rather than mutate the caller's object."""
    from app.ai import plan_generator as pg

    scaffold = _make_scaffold_needing_padding()
    plan = _make_plan_triggering_padding_and_clamp()
    original = copy.deepcopy(plan)

    pg.validate_and_correct_plan(plan, "beginner", scaffold)

    assert plan == original


# ── C2: STUB_PLAN fixture must not be corrupted across repeated calls ──────────


@pytest.mark.asyncio
async def test_stub_plan_fixture_unchanged_across_repeated_assemble_plan_calls(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reproduces the flakiness mechanism: @stubbed must hand back a copy, not STUB_PLAN itself.

    Pre-fix, mutating the dict returned by assemble_plan (as the caller
    legitimately may, since validate_and_correct_plan used to mutate its
    input in place) permanently corrupts the shared STUB_PLAN fixture for
    every later test in the same process.
    """
    monkeypatch.setenv("STUB_LLM", "true")

    original_week_count = len(STUB_PLAN["weeks"])  # type: ignore[arg-type]
    original_session_count = len(STUB_PLAN["weeks"][0]["sessions"])  # type: ignore[index]

    result_1: dict[str, object] = await assemble_plan(  # type: ignore[assignment]
        {
            "archetype": "general-crossfit",
            "title": "Run 1",
            "equipment": [],
            "days_per_week": 3,
            "training_age": "intermediate",
        },
        {},
        db=None,
    )
    # Mutate the returned object the way a careless caller could.
    result_1["weeks"][0]["sessions"] = result_1["weeks"][0]["sessions"][:1]  # type: ignore[index]
    del result_1["weeks"][0]["sessions"][0]["items"][:]  # type: ignore[index]

    result_2: dict[str, object] = await assemble_plan(  # type: ignore[assignment]
        {
            "archetype": "general-crossfit",
            "title": "Run 2",
            "equipment": [],
            "days_per_week": 3,
            "training_age": "intermediate",
        },
        {},
        db=None,
    )

    assert len(result_2["weeks"]) == original_week_count  # type: ignore[arg-type]
    assert len(result_2["weeks"][0]["sessions"]) == original_session_count  # type: ignore[index]
    assert len(STUB_PLAN["weeks"]) == original_week_count  # type: ignore[arg-type]
    assert len(STUB_PLAN["weeks"][0]["sessions"]) == original_session_count  # type: ignore[index]


@pytest.mark.asyncio
async def test_stub_plan_full_path_session_count_stable_across_two_generations(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Runs the full STUB_PLAN path (assemble_plan -> validate_and_correct_plan) twice
    in the same test session and asserts the second call's session count
    matches the first — the exact flakiness the review reproduced.

    STUB_PLAN's single week ships with 7 sessions (a full Mon-Sun week). The
    first generation below uses days_per_week=3, whose scaffold expects only
    3 sessions for that week — _enforce_session_count trims the other 4.
    Pre-fix, that trim (`del sessions[expected:]`) operates on the *same*
    list object living inside the module-level STUB_PLAN (assemble_plan
    handed back the fixture itself, and validate_and_correct_plan mutated
    its input in place), permanently shrinking STUB_PLAN's week 1 from 7
    sessions to 3 for the rest of the process. The second, independent
    generation below then inherits that corruption instead of the pristine
    7-session fixture — reproducing the review's "7 sessions -> 4"-style
    finding (this repro yields 7 -> 3, same mechanism).
    """
    from app.ai.plan_generator import validate_and_correct_plan
    from app.ai.plan_scaffold import build_scaffold
    from app.models.plan import CreatePlanRequest

    monkeypatch.setenv("STUB_LLM", "true")

    original_session_count = len(STUB_PLAN["weeks"][0]["sessions"])  # type: ignore[index]

    trimming_req = CreatePlanRequest(
        archetype="general-crossfit",
        title="First Generation (triggers a trim)",
        start_date="2026-08-04",  # type: ignore[arg-type]
        weeks=4,
        training_age="intermediate",
        equipment=[],
        days_per_week=3,  # scaffold expects 3 sessions/week — STUB_PLAN ships 7
    )
    trimming_scaffold = build_scaffold(trimming_req)

    draft_1 = await assemble_plan(trimming_req, {})
    corrected_1, errors_1 = validate_and_correct_plan(draft_1, "intermediate", trimming_scaffold)
    session_count_1 = len(corrected_1["weeks"][0]["sessions"])  # type: ignore[index]
    assert any(e.code == "sessions_trimmed" for e in errors_1)
    assert session_count_1 == 3

    # A second, independent plan generation for the SAME original fixture must
    # still see the pristine 7-session week — not whatever the first
    # generation's unrelated correction happened to leave behind.
    draft_2 = await assemble_plan(
        {
            "archetype": "general-crossfit",
            "title": "Second Generation (independent)",
            "equipment": [],
            "days_per_week": 3,
            "training_age": "intermediate",
        },
        {},
    )
    session_count_2 = len(draft_2["weeks"][0]["sessions"])  # type: ignore[index]

    assert session_count_2 == original_session_count == 7


# ── C2: stub() decorator returns a copy, never the fixture itself ──────────────


@pytest.mark.asyncio
async def test_stubbed_decorator_returns_a_copy_not_the_fixture_object(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.ai.stub import stubbed

    monkeypatch.setenv("STUB_LLM", "true")
    fixture = {"nested": {"value": 1}}

    @stubbed(fixture)
    async def fake() -> dict[str, object]:
        raise AssertionError("should not be called when stubbed")

    result = await fake()
    assert result == fixture
    assert result is not fixture
    assert result["nested"] is not fixture["nested"]

    result["nested"]["value"] = 999  # type: ignore[index]
    assert fixture["nested"]["value"] == 1
