"""Integration test for AI5: llm_usage telemetry wiring in plan_generator.py.

Before the fix, _call_llm's tier-1 call and generate_plan_revision's call both
omitted user_id/db, so app.ai.errors.call_llm never had what it needed to write
an llm_usage row for either code path — every real plan-generation or plan-
revision LLM call went unrecorded. This test exercises the real call_llm()
wrapper (not a mock of it) against the real local Supabase schema and confirms
a row actually lands in llm_usage; only the LLM provider call itself (an
httpx-bound network call in the real client) is stubbed out.
"""

from __future__ import annotations

from datetime import date
from typing import Any
from unittest.mock import MagicMock, patch

import psycopg
import pytest

from app.ai.movement_enum import PlanFill
from app.ai.plan_generator import _call_llm
from app.ai.plan_scaffold import build_scaffold
from app.models.plan import CreatePlanRequest
from tests.conftest import ALICE_ID, TEST_DB_DSN


class _FakeUsage:
    input_tokens = 123
    output_tokens = 45
    cache_read_input_tokens = 0
    cache_creation_input_tokens = 0


class _FakeRawResponse:
    model = "fake-model-ai5-test"
    usage = _FakeUsage()


def _make_req(**kwargs: object) -> CreatePlanRequest:
    defaults: dict[str, object] = dict(
        archetype="general-crossfit",
        title="AI5 Telemetry Test Plan",
        start_date=date(2026, 8, 4),
        weeks=4,
        training_age="intermediate",
        equipment=[],
        days_per_week=3,
    )
    defaults.update(kwargs)
    return CreatePlanRequest(**defaults)  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_llm_usage_row_recorded_after_plan_generation_call() -> None:
    """AI5: llm_usage must gain a row after a (stubbed-provider) plan-generation call.

    Only the provider network call (llm.client.chat.completions.create) is faked;
    app.ai.errors.call_llm — the code responsible for writing llm_usage — runs for
    real, against a real DB connection, exactly as it does in production.
    """
    req = _make_req()
    scaffold = build_scaffold(req)

    def _fake_create(**kwargs: Any) -> Any:  # noqa: ANN401
        async def _coro() -> PlanFill:
            result = PlanFill(archetype=req.archetype, weeks=[])
            # instructor normally attaches the raw provider response here; call_llm
            # reads it to populate token counts / model for the usage row.
            object.__setattr__(result, "_raw_response", _FakeRawResponse())
            return result

        return _coro()

    fake_llm = MagicMock()
    fake_llm.client.chat.completions.create = _fake_create

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN) as conn:
        with patch("app.ai.client.get_client", return_value=fake_llm):
            await _call_llm(req, scaffold, [], {}, user_id=ALICE_ID, db=conn)

        async with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            await cur.execute(
                """
                SELECT model, input_tokens, output_tokens, endpoint
                FROM public.llm_usage
                WHERE user_id = %s AND endpoint = 'assemble_plan'
                ORDER BY created_at DESC
                LIMIT 1
                """,
                [str(ALICE_ID)],
            )
            row = await cur.fetchone()

            # Clean up: this table has no per-test teardown in conftest.py.
            await conn.execute(
                "DELETE FROM public.llm_usage WHERE user_id = %s AND model = %s",
                [str(ALICE_ID), _FakeRawResponse.model],
            )
            await conn.commit()

    assert row is not None, "expected a new llm_usage row after the plan-generation call"
    assert row["model"] == "fake-model-ai5-test"
    assert row["input_tokens"] == 123
    assert row["output_tokens"] == 45
