"""Tests for the safety classifier engine and chat endpoint integration."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.engine.safety import SafetyTier, classify_safety, numeric_crosscheck


class TestStopTier:
    @pytest.mark.parametrize(
        "text",
        [
            "I have chest pain during pull-ups",
            "I think I tore my ACL",
            "I'm blacking out during workouts",
            "severe pain in my shoulder",
            "I dislocated my shoulder",
            "heart attack symptoms after my run",
            "I can't breathe after double unders",
            "I passed out between sets",
            "I tore my rotator cuff",
            "shortness of breath every time I run",
        ],
    )
    def test_stop_cases(self, text: str) -> None:
        tier, pattern = classify_safety(text)
        assert tier == SafetyTier.STOP, f"Expected STOP for: {text!r}, got {tier} ({pattern})"

    def test_stop_returns_matching_pattern(self) -> None:
        tier, pattern = classify_safety("I have chest pain")
        assert tier == SafetyTier.STOP
        assert pattern is not None


class TestModifyTier:
    @pytest.mark.parametrize(
        "text",
        [
            "my knee hurts a bit",
            "shoulder soreness after pressing",
            "I'm 6 weeks pregnant",
            "I have hypertension",
            "wrist ache from wall balls",
            "I have back pain",
            "ankle stiffness in the morning",
            "I'm diabetic",
        ],
    )
    def test_modify_cases(self, text: str) -> None:
        tier, _ = classify_safety(text)
        assert tier == SafetyTier.MODIFY, f"Expected MODIFY for: {text!r}, got {tier}"


class TestCoachTier:
    @pytest.mark.parametrize(
        "text",
        [
            "What is ACWR?",
            "How do I improve my clean technique?",
            "What's a good Fran time for an intermediate?",
            "How many sets of back squats should I do?",
            "Explain the difference between accumulation and intensification blocks",
        ],
    )
    def test_coach_cases(self, text: str) -> None:
        tier, _ = classify_safety(text)
        assert tier == SafetyTier.COACH, f"Expected COACH for: {text!r}, got {tier}"

    def test_coach_returns_none_pattern(self) -> None:
        _, pattern = classify_safety("How do I improve my snatch?")
        assert pattern is None


class TestNumericCrosscheck:
    def test_reasonable_hr_no_warning(self) -> None:
        assert numeric_crosscheck("my heart rate was 175 bpm") is None

    def test_impossibly_high_hr_flagged(self) -> None:
        warning = numeric_crosscheck("my heart rate hit 290 bpm")
        assert warning is not None
        assert "290" in warning

    def test_extreme_weight_loss_flagged(self) -> None:
        warning = numeric_crosscheck("I want to lose 20 lbs per week")
        assert warning is not None

    def test_reasonable_weight_loss_no_warning(self) -> None:
        assert numeric_crosscheck("I lost 1 lb per week for 8 weeks") is None

    def test_no_numbers_returns_none(self) -> None:
        assert numeric_crosscheck("How do I improve my clean?") is None


class TestStopBlocksLLM:
    @pytest.mark.asyncio
    async def test_stop_query_returns_stop_tier(self, alice_client: AsyncClient) -> None:
        r = await alice_client.post(
            "/api/v1/coach/chat",
            json={"question": "I have chest pain during pull-ups"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["safety_tier"] == "stop"
        assert "sets" not in data["answer"].lower()
        assert "reps" not in data["answer"].lower()

    @pytest.mark.asyncio
    async def test_coach_query_returns_coach_tier(self, alice_client: AsyncClient) -> None:
        r = await alice_client.post(
            "/api/v1/coach/chat",
            json={"question": "How do I improve my clean technique?"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["safety_tier"] in ("coach", "modify")
