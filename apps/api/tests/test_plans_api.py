"""Integration tests for the plans API (S12)."""

from __future__ import annotations

import asyncio

import pytest
from httpx import AsyncClient

CREATE_BODY = {
    "goal": "general_fitness",
    "title": "My Test Plan",
    "start_date": "2026-07-01",
    "weeks": 8,
    "training_age": "intermediate",
}


# ── Auth ───────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_plans_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.get("/api/v1/plans")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_create_plan_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.post("/api/v1/plans", json=CREATE_BODY)
    assert r.status_code == 401


# ── Validation ─────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_plan_invalid_goal(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/plans",
        json={**CREATE_BODY, "goal": "win_olympics"},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_create_plan_weeks_too_few(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/plans",
        json={**CREATE_BODY, "weeks": 2},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_create_plan_invalid_training_age(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/plans",
        json={**CREATE_BODY, "training_age": "elite"},
    )
    assert r.status_code == 422


# ── Happy path ─────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_plan_returns_202(alice_client: AsyncClient) -> None:
    r = await alice_client.post("/api/v1/plans", json=CREATE_BODY)
    assert r.status_code == 202
    data = r.json()
    assert "task_id" in data
    assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_plan_task_completes(alice_client: AsyncClient) -> None:
    r = await alice_client.post("/api/v1/plans", json=CREATE_BODY)
    task_id = r.json()["task_id"]

    # Stub is near-instant — poll up to 2s
    for _ in range(20):
        status_r = await alice_client.get(f"/api/v1/plans/tasks/{task_id}")
        if status_r.json()["status"] == "complete":
            break
        await asyncio.sleep(0.1)

    assert status_r.json()["status"] == "complete"
    assert status_r.json()["plan_id"] is not None


@pytest.mark.asyncio
async def test_plan_task_not_found_404(alice_client: AsyncClient) -> None:
    r = await alice_client.get("/api/v1/plans/tasks/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_list_plans_shows_created_plan(alice_client: AsyncClient) -> None:
    create_r = await alice_client.post("/api/v1/plans", json=CREATE_BODY)
    task_id = create_r.json()["task_id"]

    for _ in range(20):
        tr = await alice_client.get(f"/api/v1/plans/tasks/{task_id}")
        if tr.json()["status"] == "complete":
            break
        await asyncio.sleep(0.1)

    r = await alice_client.get("/api/v1/plans")
    assert r.status_code == 200
    assert len(r.json()) >= 1
    assert all("id" in p and "goal" in p for p in r.json())


@pytest.mark.asyncio
async def test_get_plan_detail(alice_client: AsyncClient) -> None:
    create_r = await alice_client.post("/api/v1/plans", json=CREATE_BODY)
    task_id = create_r.json()["task_id"]

    for _ in range(20):
        tr = await alice_client.get(f"/api/v1/plans/tasks/{task_id}")
        if tr.json()["status"] == "complete":
            break
        await asyncio.sleep(0.1)

    plan_id = tr.json()["plan_id"]
    r = await alice_client.get(f"/api/v1/plans/{plan_id}")
    assert r.status_code == 200
    data = r.json()
    assert data["goal"] == "general_fitness"
    assert isinstance(data["mesocycles"], list)
    assert len(data["mesocycles"]) >= 1
    assert isinstance(data["sessions"], list)
    assert len(data["sessions"]) >= 1


@pytest.mark.asyncio
async def test_plan_detail_has_items(alice_client: AsyncClient) -> None:
    create_r = await alice_client.post("/api/v1/plans", json=CREATE_BODY)
    task_id = create_r.json()["task_id"]

    for _ in range(20):
        tr = await alice_client.get(f"/api/v1/plans/tasks/{task_id}")
        if tr.json()["status"] == "complete":
            break
        await asyncio.sleep(0.1)

    plan_id = tr.json()["plan_id"]
    r = await alice_client.get(f"/api/v1/plans/{plan_id}")
    strength_sessions = [s for s in r.json()["sessions"] if s["session_type"] == "strength"]
    assert any(len(s["items"]) > 0 for s in strength_sessions)


# ── IDOR ───────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_plan_idor_returns_404(alice_client: AsyncClient, bob_client: AsyncClient) -> None:
    create_r = await alice_client.post("/api/v1/plans", json=CREATE_BODY)
    task_id = create_r.json()["task_id"]

    for _ in range(20):
        tr = await alice_client.get(f"/api/v1/plans/tasks/{task_id}")
        if tr.json()["status"] == "complete":
            break
        await asyncio.sleep(0.1)

    plan_id = tr.json()["plan_id"]
    r = await bob_client.get(f"/api/v1/plans/{plan_id}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_task_idor_returns_404(alice_client: AsyncClient, bob_client: AsyncClient) -> None:
    create_r = await alice_client.post("/api/v1/plans", json=CREATE_BODY)
    task_id = create_r.json()["task_id"]

    r = await bob_client.get(f"/api/v1/plans/tasks/{task_id}")
    assert r.status_code == 404
