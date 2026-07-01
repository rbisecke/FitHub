"""Unit tests for injury-aware coach system prompt building."""

from __future__ import annotations

from app.models.coach import ActiveInjurySummary, PlannedItem, TodaySessionContext
from app.routers.coach import build_system_prompt


class TestBuildSystemPromptNoContext:
    def test_no_profile_no_injuries_no_session(self) -> None:
        prompt = build_system_prompt(None)
        assert "CrossFit" in prompt
        assert "injuries" not in prompt.lower()
        assert "planned session" not in prompt.lower()

    def test_empty_injuries_list_no_injury_block(self) -> None:
        prompt = build_system_prompt(None, injuries=[])
        assert "Active injuries" not in prompt
        assert "MEDICAL ALERT" not in prompt


class TestBuildSystemPromptInjuries:
    def test_training_injury_appears_in_prompt(self) -> None:
        injuries = [
            ActiveInjurySummary(
                body_region="hamstring",
                pain_level=5,
                notes="tightness after sprint",
                requires_referral=False,
                contraindicated=["deadlift", "sprint", "romanian_deadlift"],
            )
        ]
        prompt = build_system_prompt(None, injuries=injuries)
        assert "hamstring" in prompt
        assert "pain 5/10" in prompt
        assert "tightness after sprint" in prompt
        assert "`deadlift`" in prompt
        assert "`sprint`" in prompt
        assert "Active injuries" in prompt

    def test_referral_injury_raises_medical_alert(self) -> None:
        injuries = [
            ActiveInjurySummary(
                body_region="knee",
                pain_level=9,
                notes=None,
                requires_referral=True,
                contraindicated=[],
            )
        ]
        prompt = build_system_prompt(None, injuries=injuries)
        assert "MEDICAL ALERT" in prompt
        assert "knee" in prompt
        assert "physio" in prompt

    def test_mixed_referral_and_training_injuries(self) -> None:
        injuries = [
            ActiveInjurySummary(
                body_region="knee",
                pain_level=9,
                notes=None,
                requires_referral=True,
                contraindicated=[],
            ),
            ActiveInjurySummary(
                body_region="forearm",
                pain_level=3,
                notes=None,
                requires_referral=False,
                contraindicated=["pull_up", "deadlift"],
            ),
        ]
        prompt = build_system_prompt(None, injuries=injuries)
        assert "MEDICAL ALERT" in prompt
        assert "knee" in prompt
        assert "Active injuries" in prompt
        assert "forearm" in prompt

    def test_injury_without_notes_no_quote_in_prompt(self) -> None:
        injuries = [
            ActiveInjurySummary(
                body_region="shoulder",
                pain_level=4,
                notes=None,
                requires_referral=False,
                contraindicated=["pull_up"],
            )
        ]
        prompt = build_system_prompt(None, injuries=injuries)
        assert "shoulder" in prompt
        assert '("' not in prompt

    def test_injury_without_contraindicated_still_appears(self) -> None:
        injuries = [
            ActiveInjurySummary(
                body_region="other",
                pain_level=3,
                notes="general soreness",
                requires_referral=False,
                contraindicated=[],
            )
        ]
        prompt = build_system_prompt(None, injuries=injuries)
        assert "other" in prompt
        assert "Contraindicated" not in prompt


class TestBuildSystemPromptTodaySession:
    def test_today_session_appears_in_prompt(self) -> None:
        session = TodaySessionContext(
            session_type="strength",
            title="Lower body day",
            items=[
                PlannedItem(
                    movement_name="deadlift",
                    sets=4,
                    reps="5",
                    load_kg=None,
                    load_pct_1rm=80.0,
                ),
                PlannedItem(
                    movement_name="back_squat",
                    sets=3,
                    reps="8",
                    load_kg=None,
                    load_pct_1rm=None,
                ),
            ],
        )
        prompt = build_system_prompt(None, today_session=session)
        assert "Lower body day" in prompt
        assert "strength" in prompt
        assert "deadlift" in prompt
        assert "80%" in prompt
        assert "back_squat" in prompt

    def test_today_session_without_items(self) -> None:
        session = TodaySessionContext(
            session_type="rest",
            title="Rest day",
            items=[],
        )
        prompt = build_system_prompt(None, today_session=session)
        assert "Rest day" in prompt
        assert "Prescribed movements" not in prompt

    def test_load_kg_appears_when_no_pct(self) -> None:
        session = TodaySessionContext(
            session_type="strength",
            title="Heavy day",
            items=[
                PlannedItem(
                    movement_name="clean",
                    sets=5,
                    reps="3",
                    load_kg=95.0,
                    load_pct_1rm=None,
                )
            ],
        )
        prompt = build_system_prompt(None, today_session=session)
        assert "95.0 kg" in prompt

    def test_cross_reference_instruction_present(self) -> None:
        session = TodaySessionContext(session_type="metcon", title="Helen", items=[])
        prompt = build_system_prompt(None, today_session=session)
        assert "cross-reference" in prompt


class TestBuildSystemPromptCombined:
    def test_injury_and_session_both_injected(self) -> None:
        injuries = [
            ActiveInjurySummary(
                body_region="hamstring",
                pain_level=6,
                notes="cleared to train — restrictions only",
                requires_referral=False,
                contraindicated=["deadlift", "sprint"],
            )
        ]
        session = TodaySessionContext(
            session_type="strength",
            title="Lower body",
            items=[
                PlannedItem(
                    movement_name="deadlift",
                    sets=4,
                    reps="5",
                    load_kg=None,
                    load_pct_1rm=80.0,
                )
            ],
        )
        prompt = build_system_prompt(None, injuries=injuries, today_session=session)
        assert "hamstring" in prompt
        assert "deadlift" in prompt
        assert "Lower body" in prompt
        assert "80%" in prompt
