"""Integration tests for plan-generation integrity fixes (C1).

C1: get_equipment_filtered_movements selected two columns that don't exist on
public.movements (is_active, primary_pattern), so every real (non-stubbed)
call raised psycopg.errors.UndefinedColumn. STUB_LLM=true (this repo's
default test mode) short-circuits assemble_plan before this query ever runs,
and the pre-fix stub-path integration test passed db=None, which skips the
equipment filter entirely — so nothing in CI ever executed this SQL against
the real schema. These tests run it for real.
"""

from __future__ import annotations

import asyncio

import psycopg
import pytest
from httpx import AsyncClient

from tests.conftest import TEST_DB_DSN, requires_ollama


@pytest.mark.asyncio
async def test_get_equipment_filtered_movements_live_db_no_filter() -> None:
    """C1 regression: the query must run against the real schema without error.

    Uses a live connection (not a mock, not db=None) — the exact path that
    raised psycopg.errors.UndefinedColumn before the fix.
    """
    from app.ai.plan_generator import get_equipment_filtered_movements

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN) as conn:
        rows = await get_equipment_filtered_movements(conn, "", [])

    assert isinstance(rows, list)
    assert len(rows) > 0  # local schema is seeded with the movement catalog
    for row in rows:
        assert set(row.keys()) == {"id", "name", "movement_pattern", "equipment_required"}


@pytest.mark.asyncio
async def test_get_equipment_filtered_movements_live_db_with_equipment() -> None:
    """C1: the equipment-subset filter (<@ operator) must also execute cleanly."""
    from app.ai.plan_generator import get_equipment_filtered_movements

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN) as conn:
        rows = await get_equipment_filtered_movements(conn, "", ["barbell", "rack"])

    assert isinstance(rows, list)
    for row in rows:
        required = set(row["equipment_required"] or [])
        assert required <= {"barbell", "rack"}


@requires_ollama
@pytest.mark.asyncio
async def test_create_plan_full_path_with_real_llm_and_live_equipment_filter(
    ollama_env: None, alice_client: object
) -> None:
    """C1 end-to-end: POST /api/v1/plans -> poll to completion with STUB_LLM=false.

    Exercises the production path exactly: run_plan_generation opens a live db
    connection and passes it into assemble_plan, which (with the @stubbed
    short-circuit disabled) calls get_equipment_filtered_movements for real.
    Skipped automatically when no local Ollama server is running, matching
    this repo's existing convention for tests that need a real LLM backend
    (see tests/test_llm_ollama.py).
    """
    client = alice_client
    assert isinstance(client, AsyncClient)

    body = {
        "archetype": "general-crossfit",
        "title": "Live LLM Equipment Filter Test",
        "start_date": "2026-07-01",
        "weeks": 4,
        "training_age": "intermediate",
        "days_per_week": 3,
        "equipment": ["barbell", "pull_up_bar"],
    }
    r = await client.post("/api/v1/plans", json=body)
    assert r.status_code == 202
    task_id = r.json()["task_id"]

    status_r = None
    for _ in range(300):  # local Ollama generation can take minutes
        status_r = await client.get(f"/api/v1/plans/tasks/{task_id}")
        if status_r.json()["status"] in ("complete", "failed"):
            break
        await asyncio.sleep(1)

    assert status_r is not None
    data = status_r.json()
    assert data["status"] == "complete", data.get("error")
    assert data["plan_id"] is not None
