"""Unit tests for validate_and_correct_plan (BE-03)."""

from __future__ import annotations

import logging

import pytest

from app.ai.plan_generator import validate_and_correct_plan
from app.ai.plan_scaffold import MEV_MAV_MRV
from app.models.plan import PlanScaffold, SessionSlot, WeekSlot

# ── Scaffold helpers ──────────────────────────────────────────────────────────


def _make_scaffold(weeks: dict[int, int]) -> PlanScaffold:
    """Build a minimal PlanScaffold with the given {week_number: session_count} map."""
    week_slots = [
        WeekSlot(
            week_number=wn,
            phase="accumulation",
            sessions=[
                SessionSlot(
                    day_of_week=i,
                    session_type="strength",
                    intensity_hint="moderate",
                )
                for i in range(n)
            ],
            target_volume_sets={},
            target_intensity_pct=0.75,
            is_deload=False,
            volume_multiplier=1.0,
        )
        for wn, n in weeks.items()
    ]
    return PlanScaffold(
        archetype="general-crossfit",
        total_weeks=max(weeks.keys()),
        mesocycles=[],
        weeks=week_slots,
        deload_weeks=set(),
        target_movement_id=None,
        equipment_tags=[],
    )


def _make_plan(weeks_data: list[dict]) -> dict:
    return {"mesocycles": [], "weeks": weeks_data}


# ── Scenario A: sets clamped to MRV ──────────────────────────────────────────


def test_sets_clamped_to_mrv() -> None:
    """When weekly squat sets exceed intermediate MRV (20), they are scaled down proportionally."""
    mrv = MEV_MAV_MRV["intermediate"]["squat"][2]  # 20
    scaffold = _make_scaffold({1: 3})

    # 3 sessions with 8 squat sets each = 24 total > MRV 20
    sessions = [
        {
            "session_type": "strength",
            "items": [{"movement_pattern": "squat", "sets": 8}],
        },
        {
            "session_type": "strength",
            "items": [{"movement_pattern": "squat", "sets": 8}],
        },
        {
            "session_type": "strength",
            "items": [{"movement_pattern": "squat", "sets": 8}],
        },
    ]
    plan = _make_plan([{"week": 1, "sessions": sessions}])

    corrected, errors = validate_and_correct_plan(plan, "intermediate", scaffold)

    codes = [e.code for e in errors]
    assert "sets_clamped" in codes

    total_squat_sets = sum(
        item["sets"]
        for s in corrected["weeks"][0]["sessions"]
        for item in s["items"]
        if item.get("movement_pattern") == "squat"
    )
    # Allow +1 per session for rounding (round() can round up each item by at most 1)
    assert total_squat_sets <= mrv + len(sessions)


def test_sets_proportional_scaling() -> None:
    """Proportional scaling keeps relative ratios between sessions."""
    scaffold = _make_scaffold({1: 2})

    # Two sessions: 12 and 16 squat sets = 28 total, MRV = 20 for intermediate
    sessions = [
        {
            "session_type": "strength",
            "items": [{"movement_pattern": "squat", "sets": 12}],
        },
        {
            "session_type": "strength",
            "items": [{"movement_pattern": "squat", "sets": 16}],
        },
    ]
    plan = _make_plan([{"week": 1, "sessions": sessions}])

    corrected, errors = validate_and_correct_plan(plan, "intermediate", scaffold)

    codes = [e.code for e in errors]
    assert "sets_clamped" in codes
    sets_after = [s["items"][0]["sets"] for s in corrected["weeks"][0]["sessions"]]
    assert all(s >= 1 for s in sets_after)


def test_sets_within_mrv_not_changed() -> None:
    """When sets are within MRV no correction is applied."""
    scaffold = _make_scaffold({1: 1})

    plan = _make_plan(
        [
            {
                "week": 1,
                "sessions": [
                    {
                        "session_type": "strength",
                        "items": [{"movement_pattern": "squat", "sets": 5}],
                    }
                ],
            }
        ]
    )

    corrected, errors = validate_and_correct_plan(plan, "intermediate", scaffold)
    codes = [e.code for e in errors]
    assert "sets_clamped" not in codes
    assert corrected["weeks"][0]["sessions"][0]["items"][0]["sets"] == 5


# ── Scenario B: session count enforcement ─────────────────────────────────────


def test_sessions_trimmed_when_too_many() -> None:
    """Extra sessions beyond the scaffold count are removed."""
    scaffold = _make_scaffold({1: 3})

    sessions = [
        {"session_type": "strength", "items": []},
        {"session_type": "strength", "items": []},
        {"session_type": "strength", "items": []},
        {"session_type": "strength", "items": []},
        {"session_type": "strength", "items": []},
    ]
    plan = _make_plan([{"week": 1, "sessions": sessions}])

    corrected, errors = validate_and_correct_plan(plan, "intermediate", scaffold)

    codes = [e.code for e in errors]
    assert "sessions_trimmed" in codes
    assert len(corrected["weeks"][0]["sessions"]) == 3


def test_sessions_padded_when_too_few() -> None:
    """Missing sessions are padded with active_recovery placeholders."""
    scaffold = _make_scaffold({1: 4})

    plan = _make_plan([{"week": 1, "sessions": [{"session_type": "strength", "items": []}]}])

    corrected, errors = validate_and_correct_plan(plan, "intermediate", scaffold)

    codes = [e.code for e in errors]
    assert "sessions_padded" in codes
    week_sessions = corrected["weeks"][0]["sessions"]
    assert len(week_sessions) == 4
    # Padded sessions are active_recovery
    assert all(s["session_type"] == "active_recovery" for s in week_sessions[1:])


# ── Scenario C: exercise count per session ────────────────────────────────────


def test_exercise_count_trimmed_to_8() -> None:
    """Sessions with more than 8 exercises are trimmed to 8."""
    scaffold = _make_scaffold({1: 1})

    items = [{"movement_pattern": "squat", "sets": 1}] * 12
    plan = _make_plan([{"week": 1, "sessions": [{"session_type": "strength", "items": items}]}])

    corrected, errors = validate_and_correct_plan(plan, "intermediate", scaffold)

    codes = [e.code for e in errors]
    assert "exercise_count_trimmed" in codes
    assert len(corrected["weeks"][0]["sessions"][0]["items"]) == 8


def test_placeholder_added_to_empty_non_rest_session() -> None:
    """Empty non-rest sessions get an Air Squat placeholder."""
    scaffold = _make_scaffold({1: 1})

    plan = _make_plan([{"week": 1, "sessions": [{"session_type": "strength", "items": []}]}])

    corrected, errors = validate_and_correct_plan(plan, "intermediate", scaffold)

    codes = [e.code for e in errors]
    assert "exercise_placeholder_added" in codes
    items = corrected["weeks"][0]["sessions"][0]["items"]
    assert len(items) == 1
    assert items[0]["movement_name"] == "Air Squat"


def test_empty_rest_session_not_padded() -> None:
    """Empty rest/active_recovery sessions are left alone (no placeholder added)."""
    scaffold = _make_scaffold({1: 1})

    for stype in ("rest", "active_recovery"):
        plan = _make_plan([{"week": 1, "sessions": [{"session_type": stype, "items": []}]}])
        corrected, errors = validate_and_correct_plan(plan, "intermediate", scaffold)
        codes = [e.code for e in errors]
        assert "exercise_placeholder_added" not in codes
        assert corrected["weeks"][0]["sessions"][0]["items"] == []


# ── Scenario D: load_pct_1rm clamped ──────────────────────────────────────────


def test_load_pct_clamped_low() -> None:
    """load_pct below 40 is raised to 40."""
    scaffold = _make_scaffold({1: 1})

    plan = _make_plan(
        [
            {
                "week": 1,
                "sessions": [
                    {
                        "session_type": "strength",
                        "items": [{"movement_pattern": "squat", "sets": 3, "load_pct_1rm": 10.0}],
                    }
                ],
            }
        ]
    )

    corrected, errors = validate_and_correct_plan(plan, "intermediate", scaffold)

    codes = [e.code for e in errors]
    assert "load_pct_clamped" in codes
    assert corrected["weeks"][0]["sessions"][0]["items"][0]["load_pct_1rm"] == 40.0


def test_load_pct_clamped_high() -> None:
    """load_pct above 95 is lowered to 95."""
    scaffold = _make_scaffold({1: 1})

    plan = _make_plan(
        [
            {
                "week": 1,
                "sessions": [
                    {
                        "session_type": "strength",
                        "items": [{"movement_pattern": "squat", "sets": 3, "load_pct_1rm": 110.0}],
                    }
                ],
            }
        ]
    )

    corrected, errors = validate_and_correct_plan(plan, "intermediate", scaffold)

    codes = [e.code for e in errors]
    assert "load_pct_clamped" in codes
    assert corrected["weeks"][0]["sessions"][0]["items"][0]["load_pct_1rm"] == 95.0


def test_load_pct_none_ignored() -> None:
    """None load_pct_1rm is left unchanged (bodyweight/cardio movements)."""
    scaffold = _make_scaffold({1: 1})

    plan = _make_plan(
        [
            {
                "week": 1,
                "sessions": [
                    {
                        "session_type": "strength",
                        "items": [{"movement_pattern": "squat", "sets": 3, "load_pct_1rm": None}],
                    }
                ],
            }
        ]
    )

    _, errors = validate_and_correct_plan(plan, "intermediate", scaffold)

    codes = [e.code for e in errors]
    assert "load_pct_clamped" not in codes


# ── Scenario E: never raises ──────────────────────────────────────────────────


def test_never_raises_on_malformed_input() -> None:
    """validate_and_correct_plan must not raise even with garbage input."""
    scaffold = _make_scaffold({1: 3})

    bad_inputs = [
        {},
        {"weeks": None},
        {"weeks": "not a list"},
        {"weeks": [None, "string", 42]},
        {"weeks": [{"week": "bad", "sessions": [{"items": None}]}]},
        _make_plan([{"week": 1, "sessions": [{"session_type": None, "items": [None, "x", {}]}]}]),
    ]

    for bad in bad_inputs:
        result, errors = validate_and_correct_plan(bad, "intermediate", scaffold)
        assert isinstance(result, dict)
        assert isinstance(errors, list)


# ── Scenario F: corrections emitted as log entries ────────────────────────────


def test_corrections_emitted_as_log_entries(caplog: pytest.LogCaptureFixture) -> None:
    """Every correction must emit a logger.info("plan_correction", ...) entry."""
    scaffold = _make_scaffold({1: 3})

    # Trigger sets_clamped: 3 sessions × 10 squat sets = 30 > MRV 20
    sessions = [
        {"session_type": "strength", "items": [{"movement_pattern": "squat", "sets": 10}]}
        for _ in range(3)
    ]
    plan = _make_plan([{"week": 1, "sessions": sessions}])

    with caplog.at_level(logging.INFO, logger="app.ai.plan_generator"):
        _, errors = validate_and_correct_plan(plan, "intermediate", scaffold)

    assert any("plan_correction" in r.message for r in caplog.records)
    assert any(e.code == "sets_clamped" for e in errors)


# ── Scenario G: valid plan unchanged ─────────────────────────────────────────


def test_valid_plan_returned_unchanged() -> None:
    """A plan that already satisfies all constraints produces no errors."""
    scaffold = _make_scaffold({1: 2})

    sessions = [
        {
            "session_type": "strength",
            "items": [
                {"movement_pattern": "squat", "sets": 5, "load_pct_1rm": 75.0},
                {"movement_pattern": "hinge", "sets": 3, "load_pct_1rm": 70.0},
            ],
        },
        {
            "session_type": "metcon",
            "items": [
                {"movement_pattern": "locomotion", "sets": 1, "load_pct_1rm": None},
            ],
        },
    ]
    plan = _make_plan([{"week": 1, "sessions": sessions}])

    _, errors = validate_and_correct_plan(plan, "intermediate", scaffold)

    assert errors == []
