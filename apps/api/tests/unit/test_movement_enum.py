"""Unit tests for app.ai.movement_enum — no DB, no network, no LLM."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.ai.movement_enum import (
    ExerciseSelection,
    PlanFill,
    SessionFill,
    WeekFill,
    build_movement_enum,
)

# ---------------------------------------------------------------------------
# build_movement_enum
# ---------------------------------------------------------------------------


class TestBuildMovementEnum:
    def _pool(self, names: list[str]) -> list[dict[str, object]]:
        return [{"name": n, "id": f"id-{i}"} for i, n in enumerate(names)]

    def test_five_movements_produce_five_members(self) -> None:
        names = ["Back Squat", "Deadlift", "Pull-up", "Push Press", "Box Jump"]
        MovEnum = build_movement_enum(self._pool(names))
        assert len(MovEnum) == 5

    def test_name_converts_to_upper_snake_case_key(self) -> None:
        MovEnum = build_movement_enum(self._pool(["Back Squat"]))
        assert "BACK_SQUAT" in MovEnum.__members__

    def test_special_chars_stripped_from_key(self) -> None:
        # Hyphens and slashes are special characters that should be stripped.
        MovEnum = build_movement_enum(self._pool(["Pull-up", "Push/Press"]))
        assert "PULLUP" in MovEnum.__members__
        assert "PUSHPRESS" in MovEnum.__members__

    def test_enum_value_is_original_name_string(self) -> None:
        MovEnum = build_movement_enum(self._pool(["Back Squat", "Romanian Deadlift"]))
        assert MovEnum["BACK_SQUAT"].value == "Back Squat"
        assert MovEnum["ROMANIAN_DEADLIFT"].value == "Romanian Deadlift"

    def test_duplicate_names_produce_unique_keys(self) -> None:
        # Two entries with the same name must not collide.
        # The first keeps its raw name as the value; subsequent duplicates get a
        # parenthetical suffix so Python's Enum doesn't treat them as aliases.
        pool = [
            {"name": "Row", "id": "id-1"},
            {"name": "Row", "id": "id-2"},
        ]
        MovEnum = build_movement_enum(pool)
        assert len(MovEnum) == 2
        assert "ROW" in MovEnum.__members__
        assert "ROW_2" in MovEnum.__members__
        assert MovEnum["ROW"].value == "Row"
        assert MovEnum["ROW_2"].value == "Row (2)"

    def test_empty_list_produces_empty_enum(self) -> None:
        MovEnum = build_movement_enum([])
        assert len(MovEnum) == 0

    def test_member_value_equals_original_name(self) -> None:
        names = ["Thruster", "Wall Ball", "Box Jump"]
        MovEnum = build_movement_enum(self._pool(names))
        for member in MovEnum:
            assert member.value in names

    def test_multiple_duplicates_get_incrementing_suffixes(self) -> None:
        pool = [
            {"name": "Snatch", "id": "a"},
            {"name": "Snatch", "id": "b"},
            {"name": "Snatch", "id": "c"},
        ]
        MovEnum = build_movement_enum(pool)
        assert len(MovEnum) == 3
        assert "SNATCH" in MovEnum.__members__
        assert "SNATCH_2" in MovEnum.__members__
        assert "SNATCH_3" in MovEnum.__members__
        assert MovEnum["SNATCH"].value == "Snatch"
        assert MovEnum["SNATCH_2"].value == "Snatch (2)"
        assert MovEnum["SNATCH_3"].value == "Snatch (3)"

    def test_mixed_case_name_produces_upper_key(self) -> None:
        MovEnum = build_movement_enum([{"name": "kettlebell swing", "id": "x"}])
        assert "KETTLEBELL_SWING" in MovEnum.__members__

    def test_enum_is_string_subclass(self) -> None:
        MovEnum = build_movement_enum([{"name": "Squat", "id": "x"}])
        member = MovEnum["SQUAT"]
        assert isinstance(member.value, str)


# ---------------------------------------------------------------------------
# ExerciseSelection
# ---------------------------------------------------------------------------


class TestExerciseSelection:
    def _valid(self, **overrides: object) -> dict[str, object]:
        base: dict[str, object] = {
            "movement_name": "Back Squat",
            "sets": 4,
            "reps_or_duration": "5",
            "load_pct": 0.75,
            "notes": None,
        }
        base.update(overrides)
        return base

    def test_valid_construction(self) -> None:
        ex = ExerciseSelection(**self._valid())
        assert ex.movement_name == "Back Squat"
        assert ex.sets == 4
        assert ex.reps_or_duration == "5"
        assert ex.load_pct == 0.75

    def test_sets_minimum_boundary_accepted(self) -> None:
        ex = ExerciseSelection(**self._valid(sets=1))
        assert ex.sets == 1

    def test_sets_maximum_boundary_accepted(self) -> None:
        ex = ExerciseSelection(**self._valid(sets=10))
        assert ex.sets == 10

    def test_sets_zero_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ExerciseSelection(**self._valid(sets=0))

    def test_sets_eleven_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ExerciseSelection(**self._valid(sets=11))

    def test_load_pct_none_accepted(self) -> None:
        ex = ExerciseSelection(**self._valid(load_pct=None))
        assert ex.load_pct is None

    def test_load_pct_zero_accepted(self) -> None:
        ex = ExerciseSelection(**self._valid(load_pct=0.0))
        assert ex.load_pct == 0.0

    def test_load_pct_one_accepted(self) -> None:
        ex = ExerciseSelection(**self._valid(load_pct=1.0))
        assert ex.load_pct == 1.0

    def test_load_pct_above_one_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ExerciseSelection(**self._valid(load_pct=1.01))

    def test_load_pct_below_zero_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ExerciseSelection(**self._valid(load_pct=-0.01))

    def test_notes_optional(self) -> None:
        ex = ExerciseSelection(**self._valid(notes=None))
        assert ex.notes is None

    def test_reps_or_duration_accepts_various_formats(self) -> None:
        for val in ("5", "21-15-9", "400m", "2:00", "AMRAP"):
            ex = ExerciseSelection(**self._valid(reps_or_duration=val))
            assert ex.reps_or_duration == val


# ---------------------------------------------------------------------------
# SessionFill
# ---------------------------------------------------------------------------


class TestSessionFill:
    def _exercise(self) -> dict[str, object]:
        return {
            "movement_name": "Back Squat",
            "sets": 3,
            "reps_or_duration": "5",
            "load_pct": 0.75,
        }

    def test_valid_session(self) -> None:
        sess = SessionFill(
            session_type="strength",
            exercises=[self._exercise(), self._exercise(), self._exercise()],
        )
        assert sess.session_type == "strength"
        assert len(sess.exercises) == 3

    def test_fewer_than_three_exercises_rejected(self) -> None:
        with pytest.raises(ValidationError):
            SessionFill(
                session_type="strength",
                exercises=[self._exercise(), self._exercise()],
            )

    def test_more_than_eight_exercises_rejected(self) -> None:
        with pytest.raises(ValidationError):
            SessionFill(
                session_type="strength",
                exercises=[self._exercise()] * 9,
            )

    def test_eight_exercises_accepted(self) -> None:
        sess = SessionFill(
            session_type="metcon",
            exercises=[self._exercise()] * 8,
        )
        assert len(sess.exercises) == 8


# ---------------------------------------------------------------------------
# WeekFill
# ---------------------------------------------------------------------------


class TestWeekFill:
    def _session(self) -> dict[str, object]:
        exercise = {
            "movement_name": "Deadlift",
            "sets": 3,
            "reps_or_duration": "3",
            "load_pct": 0.80,
        }
        return {
            "session_type": "strength",
            "exercises": [exercise, exercise, exercise],
        }

    def test_valid_week(self) -> None:
        week = WeekFill(week_number=1, sessions=[self._session()])
        assert week.week_number == 1
        assert len(week.sessions) == 1

    def test_week_number_below_one_rejected(self) -> None:
        with pytest.raises(ValidationError):
            WeekFill(week_number=0, sessions=[self._session()])

    def test_multiple_sessions(self) -> None:
        week = WeekFill(week_number=3, sessions=[self._session(), self._session()])
        assert len(week.sessions) == 2


# ---------------------------------------------------------------------------
# PlanFill
# ---------------------------------------------------------------------------


class TestPlanFill:
    def _week(self) -> dict[str, object]:
        exercise = {
            "movement_name": "Thruster",
            "sets": 3,
            "reps_or_duration": "21-15-9",
            "load_pct": None,
        }
        session = {
            "session_type": "metcon",
            "exercises": [exercise, exercise, exercise],
        }
        return {"week_number": 1, "sessions": [session]}

    def test_valid_plan_fill(self) -> None:
        plan = PlanFill(
            archetype="general-crossfit",
            weeks=[self._week()],
            coaching_notes="Focus on pacing.",
        )
        assert plan.archetype == "general-crossfit"
        assert len(plan.weeks) == 1
        assert plan.coaching_notes == "Focus on pacing."

    def test_coaching_notes_optional(self) -> None:
        plan = PlanFill(archetype="strength-bias", weeks=[self._week()])
        assert plan.coaching_notes is None

    def test_multiple_weeks(self) -> None:
        w1 = self._week()
        w2 = {**self._week(), "week_number": 2}
        plan = PlanFill(archetype="aerobic-base", weeks=[w1, w2])
        assert len(plan.weeks) == 2

    def test_pydantic_model_is_serializable(self) -> None:
        plan = PlanFill(archetype="general-crossfit", weeks=[self._week()])
        data = plan.model_dump()
        assert data["archetype"] == "general-crossfit"
        assert isinstance(data["weeks"], list)
