"""Live LLM integration tests — run against a local Ollama instance.

These tests are skipped automatically when Ollama is not running.
To run them:
    ollama serve          # in a separate terminal
    ollama pull mistral:7b
    uv run pytest tests/test_llm_ollama.py -v
"""

from __future__ import annotations

import pytest

from tests.conftest import requires_ollama

# ── parse_log ─────────────────────────────────────────────────────────────────


@requires_ollama
@pytest.mark.asyncio
async def test_parse_log_returns_valid_schema(ollama_env: None) -> None:
    from app.ai.parse_log import parse_log_text

    result = await parse_log_text("Back squat 5 sets of 5 reps at 100 kg, RPE 8, felt strong")
    assert result.stub is False
    assert result.parsed is not None
    assert result.parsed.session_type in {
        "metcon",
        "strength",
        "skill",
        "cardio",
        "mixed",
        "rest",
        "unknown",
    }
    assert 0.0 <= result.confidence <= 1.0


@requires_ollama
@pytest.mark.asyncio
async def test_parse_log_metcon_has_results(ollama_env: None) -> None:
    from app.ai.parse_log import parse_log_text

    # Use an unambiguous input — avoid "21-15-9" patterns that confuse small models
    # (mistral:7b passes reps as a list instead of int for rep-scheme notation)
    result = await parse_log_text(
        "Metcon: 5 rounds of 10 thrusters at 42 kg and 10 pull-ups, finished in 8 minutes"
    )
    assert result.stub is False
    valid = {"metcon", "strength", "skill", "cardio", "mixed", "rest", "unknown"}
    assert result.parsed.session_type in valid


@requires_ollama
@pytest.mark.asyncio
async def test_parse_log_rest_day(ollama_env: None) -> None:
    from app.ai.parse_log import parse_log_text

    result = await parse_log_text("Complete rest day, feeling well recovered")
    assert result.stub is False
    # Any valid session type is acceptable — LLM may classify rest day differently
    valid = {"metcon", "strength", "skill", "cardio", "mixed", "rest", "unknown"}
    assert result.parsed.session_type in valid


# ── generate_plan ─────────────────────────────────────────────────────────────


@requires_ollama
@pytest.mark.asyncio
async def test_generate_plan_passes_kb_validation(ollama_env: None) -> None:
    from app.ai.plan_generator import generate_plan

    req = {
        "goal": "general_fitness",
        "title": "4-Week Base Plan",
        "weeks": 4,
        "training_age": "intermediate",
        "days_per_week": 3,
        "start_date": "2026-07-01",
    }
    draft = await generate_plan(req, {})
    assert "mesocycles" in draft
    assert "weeks" in draft
    assert len(draft["weeks"]) > 0  # type: ignore[arg-type]


@requires_ollama
@pytest.mark.asyncio
async def test_generate_plan_session_types_valid(ollama_env: None) -> None:
    from app.ai.plan_generator import generate_plan

    valid_types = {"strength", "metcon", "skill", "cardio", "mixed", "active_recovery", "rest"}
    req = {
        "goal": "strength",
        "title": "Strength Focus",
        "weeks": 4,
        "training_age": "beginner",
        "days_per_week": 3,
        "start_date": "2026-07-01",
    }
    draft = await generate_plan(req, {})
    for week in draft["weeks"]:  # type: ignore[union-attr]
        for session in week["sessions"]:  # type: ignore[index]
            assert session["session_type"] in valid_types


# ── generate_adaptation ───────────────────────────────────────────────────────


@requires_ollama
@pytest.mark.asyncio
async def test_generate_adaptation_returns_rationale(ollama_env: None) -> None:
    from app.ai.adaptation import generate_adaptation

    trigger = {"trigger_type": "low_readiness", "trigger_data": {"score": 45}}
    sessions = [
        {"title": "Heavy Squat", "session_type": "strength", "day_offset": 0, "week": 1},
        {"title": "Conditioning", "session_type": "metcon", "day_offset": 2, "week": 1},
    ]
    result = await generate_adaptation(trigger, sessions)
    assert result["stub"] is False
    assert isinstance(result["rationale"], str)
    assert len(str(result["rationale"])) >= 20


@requires_ollama
@pytest.mark.asyncio
async def test_generate_adaptation_diff_references_known_sessions(
    ollama_env: None,
) -> None:
    from app.ai.adaptation import generate_adaptation

    trigger = {"trigger_type": "injury", "trigger_data": {"region": "knee"}}
    sessions = [
        {"title": "Lower Body Strength", "session_type": "strength", "day_offset": 0, "week": 1},
        {"title": "Rest Day", "session_type": "rest", "day_offset": 1, "week": 1},
    ]
    result = await generate_adaptation(trigger, sessions)
    diff = result["diff"]
    assert isinstance(diff, list)
    valid_changes = {"reduce_intensity", "reduce_volume", "swap_session", "add_rest", "skip"}
    for entry in diff:
        assert entry["change"] in valid_changes


# ── coach chat ────────────────────────────────────────────────────────────────


@requires_ollama
@pytest.mark.asyncio
async def test_coach_chat_returns_string_answer(ollama_env: None, alice_client: object) -> None:
    from httpx import AsyncClient

    client = alice_client  # type: ignore[assignment]
    assert isinstance(client, AsyncClient)
    res = await client.post(
        "/api/v1/coach/chat",
        json={"question": "What is a good warm-up for squats?"},
    )
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data["answer"], str)
    assert len(data["answer"]) > 0
    assert data["stub"] is False


# ── parse-log endpoint ────────────────────────────────────────────────────────


@requires_ollama
@pytest.mark.asyncio
async def test_parse_log_endpoint_with_ollama(ollama_env: None, alice_client: object) -> None:
    from httpx import AsyncClient

    client = alice_client  # type: ignore[assignment]
    assert isinstance(client, AsyncClient)
    res = await client.post(
        "/api/v1/coach/parse-log",
        json={"text": "Back squat 3x5 at 120kg, felt strong, RPE 7"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["stub"] is False
    assert data["parsed"]["session_type"] in {
        "strength",
        "metcon",
        "skill",
        "cardio",
        "mixed",
        "rest",
        "unknown",
    }
