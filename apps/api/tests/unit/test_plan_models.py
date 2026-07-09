"""Unit tests for app.models.plan — no DB, no network."""

from __future__ import annotations

import logging
import uuid
from datetime import date

import pytest
from pydantic import ValidationError
from pytest import LogCaptureFixture

from app.models.plan import (
    CreatePlanRequest,
    MesocycleScaffold,
    PlanScaffold,
    PlanSummary,
    SessionSlot,
    WeekSlot,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_START = date(2025, 9, 1)
_MOV_ID = uuid.uuid4()


def _base_request(**overrides: object) -> dict[str, object]:
    """Return a valid CreatePlanRequest payload with optional field overrides."""
    defaults: dict[str, object] = {
        "archetype": "general-crossfit",
        "title": "Q4 Base Build",
        "start_date": _START,
        "weeks": 8,
        "training_age": "intermediate",
        "days_per_week": 4,
    }
    defaults.update(overrides)
    return defaults


# ---------------------------------------------------------------------------
# CreatePlanRequest — valid cases
# ---------------------------------------------------------------------------


class TestCreatePlanRequestValid:
    def test_minimal_general_crossfit(self) -> None:
        req = CreatePlanRequest(**_base_request())
        assert req.archetype == "general-crossfit"
        assert req.equipment == []
        assert req.target_movement_id is None
        assert req.max_duration_weeks is None
        assert req.current_1rm_kg is None

    def test_all_archetypes_accepted(self) -> None:
        archetypes = [
            "general-crossfit",
            "strength-bias",
            "travel-minimal",
            "aerobic-base",
            "bodyweight-calisthenics",
        ]
        for arch in archetypes:
            req = CreatePlanRequest(**_base_request(archetype=arch))
            assert req.archetype == arch

    def test_skill_acquisition_with_required_fields(self) -> None:
        req = CreatePlanRequest(
            **_base_request(
                archetype="skill-acquisition",
                target_movement_id=_MOV_ID,
                max_duration_weeks=12,
            )
        )
        assert req.archetype == "skill-acquisition"
        assert req.target_movement_id == _MOV_ID
        assert req.max_duration_weeks == 12

    def test_one_rm_peak_with_all_fields(self) -> None:
        req = CreatePlanRequest(
            **_base_request(
                archetype="one-rm-peak",
                target_movement_id=_MOV_ID,
                current_1rm_kg=120.0,
            )
        )
        assert req.current_1rm_kg == 120.0

    def test_one_rm_peak_without_1rm_logs_warning(self, caplog: LogCaptureFixture) -> None:
        with caplog.at_level(logging.WARNING, logger="app.models.plan"):
            CreatePlanRequest(
                **_base_request(
                    archetype="one-rm-peak",
                    target_movement_id=_MOV_ID,
                )
            )
        assert "load percentages will be estimated" in caplog.text

    def test_equipment_list_accepted(self) -> None:
        req = CreatePlanRequest(**_base_request(equipment=["barbell", "pull-up-bar", "rings"]))
        assert req.equipment == ["barbell", "pull-up-bar", "rings"]

    def test_days_per_week_boundaries(self) -> None:
        for days in (2, 3, 4, 5, 6):
            req = CreatePlanRequest(**_base_request(days_per_week=days))
            assert req.days_per_week == days

    def test_weeks_boundaries(self) -> None:
        for w in (4, 12, 24):
            req = CreatePlanRequest(**_base_request(weeks=w))
            assert req.weeks == w

    def test_max_duration_weeks_accepted_for_non_skill_archetype(self) -> None:
        req = CreatePlanRequest(**_base_request(archetype="strength-bias", max_duration_weeks=16))
        assert req.max_duration_weeks == 16


# ---------------------------------------------------------------------------
# CreatePlanRequest — validation errors
# ---------------------------------------------------------------------------


class TestCreatePlanRequestInvalid:
    def test_unknown_archetype_rejected(self) -> None:
        with pytest.raises(ValidationError, match="archetype"):
            CreatePlanRequest(**_base_request(archetype="powerlifting"))

    def test_days_per_week_below_minimum(self) -> None:
        with pytest.raises(ValidationError):
            CreatePlanRequest(**_base_request(days_per_week=1))

    def test_days_per_week_above_maximum(self) -> None:
        with pytest.raises(ValidationError):
            CreatePlanRequest(**_base_request(days_per_week=7))

    def test_weeks_below_minimum(self) -> None:
        with pytest.raises(ValidationError):
            CreatePlanRequest(**_base_request(weeks=3))

    def test_weeks_above_maximum(self) -> None:
        with pytest.raises(ValidationError):
            CreatePlanRequest(**_base_request(weeks=25))

    def test_negative_1rm_rejected(self) -> None:
        with pytest.raises(ValidationError):
            CreatePlanRequest(
                **_base_request(
                    archetype="one-rm-peak",
                    target_movement_id=_MOV_ID,
                    current_1rm_kg=-5.0,
                )
            )

    def test_zero_1rm_rejected(self) -> None:
        with pytest.raises(ValidationError):
            CreatePlanRequest(
                **_base_request(
                    archetype="one-rm-peak",
                    target_movement_id=_MOV_ID,
                    current_1rm_kg=0.0,
                )
            )

    def test_skill_acquisition_without_max_duration_raises(self) -> None:
        with pytest.raises(ValidationError, match="max_duration_weeks"):
            CreatePlanRequest(
                **_base_request(
                    archetype="skill-acquisition",
                    target_movement_id=_MOV_ID,
                    # max_duration_weeks omitted intentionally
                )
            )

    def test_skill_acquisition_without_movement_raises(self) -> None:
        with pytest.raises(ValidationError, match="target_movement_id"):
            CreatePlanRequest(
                **_base_request(
                    archetype="skill-acquisition",
                    max_duration_weeks=8,
                    # target_movement_id omitted intentionally
                )
            )

    def test_one_rm_peak_without_movement_raises(self) -> None:
        with pytest.raises(ValidationError, match="target_movement_id"):
            CreatePlanRequest(
                **_base_request(
                    archetype="one-rm-peak",
                    # target_movement_id omitted intentionally
                )
            )

    def test_unknown_training_age_rejected(self) -> None:
        with pytest.raises(ValidationError):
            CreatePlanRequest(**_base_request(training_age="elite"))

    def test_max_duration_below_minimum(self) -> None:
        with pytest.raises(ValidationError):
            CreatePlanRequest(
                **_base_request(
                    archetype="strength-bias",
                    max_duration_weeks=3,
                )
            )

    def test_max_duration_above_maximum(self) -> None:
        with pytest.raises(ValidationError):
            CreatePlanRequest(
                **_base_request(
                    archetype="strength-bias",
                    max_duration_weeks=25,
                )
            )


# ---------------------------------------------------------------------------
# PlanBase / PlanSummary response model
# ---------------------------------------------------------------------------


class TestPlanBaseModel:
    def _plan_data(self, **overrides: object) -> dict[str, object]:
        base: dict[str, object] = {
            "id": uuid.uuid4(),
            "archetype": "strength-bias",
            "title": "Strength Block",
            "branch_name": "plans/strength-block-2025-09-01",
            "weeks": 12,
            "status": "active",
            "start_date": _START,
            "end_date": date(2025, 11, 24),
            "created_at": "2025-09-01T00:00:00Z",
        }
        base.update(overrides)
        return base

    def test_archetype_replaces_goal(self) -> None:
        summary = PlanSummary(**self._plan_data())
        assert summary.archetype == "strength-bias"
        assert not hasattr(summary, "goal")

    def test_training_age_optional(self) -> None:
        summary = PlanSummary(**self._plan_data())
        assert summary.training_age is None

    def test_training_age_populated(self) -> None:
        summary = PlanSummary(**self._plan_data(training_age="advanced"))
        assert summary.training_age == "advanced"

    def test_invalid_status_rejected(self) -> None:
        with pytest.raises(ValidationError):
            PlanSummary(**self._plan_data(status="deleted"))

    def test_invalid_archetype_in_response_rejected(self) -> None:
        with pytest.raises(ValidationError):
            PlanSummary(**self._plan_data(archetype="powerlifting"))


# ---------------------------------------------------------------------------
# Dataclass: SessionSlot
# ---------------------------------------------------------------------------


class TestSessionSlot:
    def test_construction(self) -> None:
        slot = SessionSlot(
            day_of_week=0,
            session_type="strength",
            intensity_hint="hard",
        )
        assert slot.day_of_week == 0
        assert slot.session_type == "strength"
        assert slot.intensity_hint == "hard"

    def test_all_session_types_accepted(self) -> None:
        types = ["strength", "metcon", "skill", "mixed", "active_recovery", "rest"]
        for t in types:
            slot = SessionSlot(day_of_week=1, session_type=t, intensity_hint="moderate")
            assert slot.session_type == t


# ---------------------------------------------------------------------------
# Dataclass: WeekSlot
# ---------------------------------------------------------------------------


class TestWeekSlot:
    def _make_sessions(self) -> list[SessionSlot]:
        return [
            SessionSlot(day_of_week=0, session_type="strength", intensity_hint="hard"),
            SessionSlot(day_of_week=2, session_type="metcon", intensity_hint="moderate"),
        ]

    def test_construction_defaults(self) -> None:
        week = WeekSlot(
            week_number=1,
            phase="accumulation",
            sessions=self._make_sessions(),
            target_volume_sets={"squat": 15, "hinge": 12},
            target_intensity_pct=0.75,
        )
        assert week.is_deload is False
        assert week.volume_multiplier == 1.0

    def test_deload_week(self) -> None:
        week = WeekSlot(
            week_number=4,
            phase="deload",
            sessions=self._make_sessions(),
            target_volume_sets={"squat": 8},
            target_intensity_pct=0.60,
            is_deload=True,
            volume_multiplier=0.6,
        )
        assert week.is_deload is True
        assert week.volume_multiplier == 0.6

    def test_metcon_week_has_none_intensity(self) -> None:
        week = WeekSlot(
            week_number=2,
            phase="accumulation",
            sessions=self._make_sessions(),
            target_volume_sets={},
            target_intensity_pct=None,
        )
        assert week.target_intensity_pct is None


# ---------------------------------------------------------------------------
# Dataclass: PlanScaffold
# ---------------------------------------------------------------------------


class TestPlanScaffold:
    def _make_scaffold(self) -> PlanScaffold:
        sessions = [
            SessionSlot(day_of_week=0, session_type="strength", intensity_hint="hard"),
            SessionSlot(day_of_week=2, session_type="metcon", intensity_hint="moderate"),
            SessionSlot(day_of_week=4, session_type="skill", intensity_hint="easy"),
            SessionSlot(day_of_week=5, session_type="metcon", intensity_hint="hard"),
        ]
        weeks = [
            WeekSlot(
                week_number=w,
                phase="accumulation",
                sessions=sessions,
                target_volume_sets={"squat": 15, "hinge": 12, "push": 18, "pull": 18},
                target_intensity_pct=0.70 + w * 0.02,
                is_deload=(w % 4 == 0),
                volume_multiplier=0.6 if w % 4 == 0 else 1.0,
            )
            for w in range(1, 9)
        ]
        mesocycles = [
            MesocycleScaffold(
                name="Base Accumulation",
                phase="accumulation",
                week_start=1,
                week_end=4,
            ),
            MesocycleScaffold(
                name="Intensification",
                phase="intensification",
                week_start=5,
                week_end=8,
            ),
        ]
        return PlanScaffold(
            archetype="general-crossfit",
            total_weeks=8,
            mesocycles=mesocycles,
            weeks=weeks,
            deload_weeks={4, 8},
            target_movement_id=None,
            equipment_tags=["barbell", "pull-up-bar"],
        )

    def test_construction(self) -> None:
        scaffold = self._make_scaffold()
        assert scaffold.archetype == "general-crossfit"
        assert scaffold.total_weeks == 8
        assert len(scaffold.weeks) == 8
        assert len(scaffold.mesocycles) == 2

    def test_deload_weeks_set(self) -> None:
        scaffold = self._make_scaffold()
        assert 4 in scaffold.deload_weeks
        assert 8 in scaffold.deload_weeks
        assert 1 not in scaffold.deload_weeks

    def test_equipment_tags(self) -> None:
        scaffold = self._make_scaffold()
        assert "barbell" in scaffold.equipment_tags

    def test_target_movement_id_optional(self) -> None:
        scaffold = self._make_scaffold()
        assert scaffold.target_movement_id is None

    def test_target_movement_id_set(self) -> None:
        scaffold = self._make_scaffold()
        scaffold.target_movement_id = _MOV_ID
        assert scaffold.target_movement_id == _MOV_ID

    def test_week_session_counts(self) -> None:
        scaffold = self._make_scaffold()
        for week in scaffold.weeks:
            assert len(week.sessions) == 4

    def test_deload_weeks_have_reduced_volume(self) -> None:
        scaffold = self._make_scaffold()
        deload_weeks = [w for w in scaffold.weeks if w.is_deload]
        assert all(w.volume_multiplier < 1.0 for w in deload_weeks)

    def test_mesocycle_scaffold_fields(self) -> None:
        scaffold = self._make_scaffold()
        first = scaffold.mesocycles[0]
        assert first.name == "Base Accumulation"
        assert first.phase == "accumulation"
        assert first.week_start == 1
        assert first.week_end == 4
