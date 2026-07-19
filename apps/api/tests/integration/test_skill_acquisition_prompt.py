"""Integration test for B1: target_movement_id -> skill slug -> prerequisite chain.

Before the fix, target_movement_id (a movement UUID) was passed directly as the
target_skill argument to build_user_history_skill, but SKILL_PREREQUISITES is
keyed by hardcoded slugs ("bar-muscle-up", "snatch", ...) — no lookup ever
translated the UUID to a slug, so every real skill-acquisition request silently
got no prerequisite context. Separately, _call_llm's history_summary construction
never read history["skill_context"] at all, so even a correctly-resolved slug
would not have reached the prompt.

This test exercises both halves against the real local Supabase schema (not a
mock, not db=None) — the exact path the review found broken — and captures the
actual prompt _call_llm sends via a fake instructor client, rather than
asserting against history dict internals.
"""

from __future__ import annotations

import json
from datetime import date
from typing import Any
from unittest.mock import MagicMock, patch

import psycopg
import pytest

from app.ai.movement_enum import PlanFill
from app.ai.plan_generator import _call_llm, resolve_target_skill_slug
from app.ai.plan_scaffold import build_scaffold
from app.ai.skill_prerequisites import SKILL_PREREQUISITES, build_user_history_skill
from app.models.plan import CreatePlanRequest
from tests.conftest import ALICE_ID, TEST_DB_DSN


async def _bar_muscle_up_id(conn: psycopg.AsyncConnection[object]) -> str:
    async with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute("SELECT id::text FROM public.movements WHERE slug = 'bar-muscle-up'")
        row = await cur.fetchone()
    assert row is not None, (
        "local seed data must include a 'Bar Muscle-Up' movement (slug 'bar-muscle-up') "
        "for this test — see supabase/seed.sql"
    )
    return row["id"]  # type: ignore[index]


@pytest.mark.asyncio
async def test_resolve_target_skill_slug_matches_skill_prerequisites_key() -> None:
    """The resolved slug must be usable as a SKILL_PREREQUISITES key."""
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN) as conn:
        movement_id = await _bar_muscle_up_id(conn)
        slug = await resolve_target_skill_slug(conn, movement_id)

    assert slug == "bar-muscle-up"
    assert slug in SKILL_PREREQUISITES


@pytest.mark.asyncio
async def test_resolve_target_skill_slug_returns_empty_for_falsy_id() -> None:
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN) as conn:
        assert await resolve_target_skill_slug(conn, None) == ""
        assert await resolve_target_skill_slug(conn, "") == ""


@pytest.mark.asyncio
async def test_skill_acquisition_prompt_contains_prerequisite_chain() -> None:
    """End-to-end: resolved slug -> build_user_history_skill -> _call_llm's prompt.

    Asserts the constructed prompt sent to call_llm contains the prerequisite
    chain text (a movement from the bar-muscle-up chain), not just the base
    history fields (recent_sessions / movement_frequency / readiness_trend).
    """
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN) as conn:
        movement_id = await _bar_muscle_up_id(conn)
        slug = await resolve_target_skill_slug(conn, movement_id)
        history = await build_user_history_skill(str(ALICE_ID), conn, slug)

    assert "skill_context" in history
    chain = SKILL_PREREQUISITES["bar-muscle-up"]

    req = CreatePlanRequest(
        archetype="skill-acquisition",
        title="Bar Muscle-Up Progression",
        start_date=date(2026, 8, 4),
        weeks=8,
        training_age="intermediate",
        equipment=[],
        days_per_week=3,
        target_movement_id=movement_id,  # type: ignore[arg-type]
        max_duration_weeks=8,
    )
    scaffold = build_scaffold(req)

    captured: dict[str, Any] = {}

    def _fake_create(**kwargs: Any) -> Any:  # noqa: ANN401
        captured["messages"] = kwargs["messages"]

        async def _coro() -> PlanFill:
            return PlanFill(archetype=req.archetype, weeks=[])

        return _coro()

    fake_llm = MagicMock()
    fake_llm.client.chat.completions.create = _fake_create

    async def fake_call_llm(coro: Any, **kwargs: Any) -> Any:  # noqa: ANN401
        return await coro

    with (
        patch("app.ai.client.get_client", return_value=fake_llm),
        patch("app.ai.errors.call_llm", fake_call_llm),
    ):
        await _call_llm(req, scaffold, [], history)

    prompt_text = json.dumps(captured["messages"], default=str)
    # Base history fields alone would not contain any chain movement name —
    # this only appears if skill_context reached the prompt.
    assert any(movement in prompt_text for movement in chain), (
        f"Expected prerequisite chain text ({chain}) in the constructed prompt, "
        "but none of the chain movements were found — skill_context did not reach "
        "the prompt"
    )
    assert "bar-muscle-up" in prompt_text
