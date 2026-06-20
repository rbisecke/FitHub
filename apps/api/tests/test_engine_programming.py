"""Unit tests for the deterministic programming KB and plan validator."""

from __future__ import annotations

from app.engine.programming import (
    MAX_HARD_DAYS_PER_WEEK,
    VOLUME_LANDMARKS,
    PlanValidationError,
    validate_plan,
)


def make_week(
    hard_days: int = 3,
    rest_days: int = 2,
    volume: dict[str, int] | None = None,
) -> dict[str, object]:
    sessions: list[dict[str, object]] = []
    squat_sets = volume.get("squat", 3) if volume else 3
    for _ in range(hard_days):
        sessions.append(
            {
                "intensity_level": "hard",
                "session_type": "strength",
                "items": [{"movement_pattern": "squat", "sets": squat_sets}],
            }
        )
    for _ in range(rest_days):
        sessions.append({"intensity_level": "easy", "session_type": "rest", "items": []})
    return {"sessions": sessions}


class TestVolumeConstants:
    def test_beginner_has_lower_max_than_advanced(self) -> None:
        assert VOLUME_LANDMARKS["beginner"]["max"] < VOLUME_LANDMARKS["advanced"]["max"]

    def test_min_always_less_than_hypertrophy(self) -> None:
        for age, v in VOLUME_LANDMARKS.items():
            assert v["min"] < v["hypertrophy"] < v["max"], f"Failed for {age}"

    def test_max_hard_days_constant(self) -> None:
        assert MAX_HARD_DAYS_PER_WEEK == 4


class TestValidatePlan:
    def test_valid_plan_returns_no_errors(self) -> None:
        plan: dict[str, object] = {"weeks": [make_week(hard_days=3, rest_days=2)]}
        assert validate_plan(plan, "intermediate") == []

    def test_too_many_hard_days_caught(self) -> None:
        plan: dict[str, object] = {"weeks": [make_week(hard_days=5, rest_days=2)]}
        errors = validate_plan(plan, "intermediate")
        hard_errors = [e for e in errors if e.code == "too_many_hard_days"]
        assert len(hard_errors) == 1
        assert hard_errors[0].week == 1

    def test_insufficient_rest_caught(self) -> None:
        plan: dict[str, object] = {"weeks": [make_week(hard_days=3, rest_days=1)]}
        errors = validate_plan(plan, "intermediate")
        rest_errors = [e for e in errors if e.code == "insufficient_rest"]
        assert len(rest_errors) == 1

    def test_volume_exceeded_for_advanced(self) -> None:
        # 3 sessions × 10 sets each = 30 > advanced max (25)
        plan: dict[str, object] = {
            "weeks": [make_week(hard_days=3, rest_days=2, volume={"squat": 10})]
        }
        errors = validate_plan(plan, "advanced")
        vol_errors = [e for e in errors if e.code == "volume_exceeded"]
        assert any("squat" in e.message for e in vol_errors)

    def test_volume_ok_for_beginner_at_low_sets(self) -> None:
        plan: dict[str, object] = {
            "weeks": [make_week(hard_days=3, rest_days=2, volume={"squat": 4})]
        }
        errors = validate_plan(plan, "beginner")
        assert not any(e.code == "volume_exceeded" for e in errors)

    def test_empty_plan_returns_no_errors(self) -> None:
        assert validate_plan({}, "intermediate") == []

    def test_multiple_weeks_errors_tracked_independently(self) -> None:
        plan: dict[str, object] = {
            "weeks": [
                make_week(hard_days=5, rest_days=2),  # bad
                make_week(hard_days=3, rest_days=2),  # good
            ]
        }
        errors = validate_plan(plan, "intermediate")
        week_nums = {e.week for e in errors}
        assert 1 in week_nums
        assert 2 not in week_nums

    def test_plan_validation_error_dataclass(self) -> None:
        err = PlanValidationError(code="test", message="msg", week=3)
        assert err.code == "test"
        assert err.week == 3

    def test_non_dict_weeks_are_skipped(self) -> None:
        plan: dict[str, object] = {"weeks": ["not a dict", None, 42]}
        assert validate_plan(plan, "intermediate") == []
