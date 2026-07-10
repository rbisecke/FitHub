"""Integration tests for AI-03: plan generation with stubbed LLM."""

from __future__ import annotations

import os

import pytest


@pytest.mark.skipif(
    os.getenv("STUB_LLM", "false").lower() != "true",
    reason="Set STUB_LLM=true to run LLM-stubbed plan generation tests",
)
@pytest.mark.asyncio
async def test_assemble_plan_returns_draft_with_stub() -> None:
    from app.ai.plan_generator import assemble_plan

    req: dict[str, object] = {
        "archetype": "general-crossfit",
        "title": "Test Plan",
        "equipment": [],
        "days_per_week": 3,
        "training_age": "intermediate",
        "target_movement_id": None,
        "max_duration_weeks": None,
        "current_1rm_kg": None,
    }
    result = await assemble_plan(req, {}, db=None)
    assert result is not None
    assert "weeks" in result or "mesocycles" in result


@pytest.mark.skipif(
    os.getenv("STUB_LLM", "false").lower() != "true",
    reason="Set STUB_LLM=true to run LLM-stubbed plan generation tests",
)
@pytest.mark.asyncio
async def test_assemble_plan_skill_acquisition_route() -> None:
    from unittest.mock import AsyncMock, patch

    from app.ai.plan_generator import assemble_plan

    req: dict[str, object] = {
        "archetype": "skill-acquisition",
        "title": "Muscle-up Program",
        "equipment": ["pull_up_bar", "rings"],
        "days_per_week": 4,
        "training_age": "intermediate",
        "target_movement_id": None,
        "max_duration_weeks": 12,
        "current_1rm_kg": None,
    }
    with patch(
        "app.ai.skill_prerequisites.build_user_history_skill",
        new_callable=AsyncMock,
        return_value="skill history context",
    ):
        result = await assemble_plan(req, {}, db=None)
    assert result is not None
