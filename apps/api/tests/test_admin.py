"""Integration tests for the admin API routes."""

from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator

import psycopg
import pytest
from httpx import ASGITransport, AsyncClient

from app.config import get_settings
from app.main import app
from tests.conftest import _TEST_USER_HEADER, ALICE_ID, TEST_DB_DSN


@pytest.fixture(autouse=True)
def _set_admin_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ADMIN_USER_IDS_CSV", str(ALICE_ID))
    # Clear the lru_cache so get_settings() reads the patched env.
    get_settings.cache_clear()


@pytest.fixture
async def admin_client(_seed_users: None) -> AsyncGenerator[AsyncClient]:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={_TEST_USER_HEADER: str(ALICE_ID)},
    ) as client:
        yield client


@pytest.fixture
async def non_admin_client(_seed_users: None) -> AsyncGenerator[AsyncClient]:
    non_admin_id = uuid.UUID("00000002-0000-0000-0000-000000000002")
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={_TEST_USER_HEADER: str(non_admin_id)},
    ) as client:
        yield client


@pytest.fixture(autouse=True)
async def _clean_access_requests() -> AsyncGenerator[None]:
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await conn.execute("DELETE FROM access_requests WHERE email LIKE '%@test-admin.example%'")
    yield
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await conn.execute("DELETE FROM access_requests WHERE email LIKE '%@test-admin.example%'")
        await conn.execute("DELETE FROM invited_emails WHERE email LIKE '%@test-admin.example%'")


# ── POST /api/v1/access-requests (public) ────────────────────────────────────


@pytest.mark.asyncio
async def test_access_request_submit(anon_client: AsyncClient) -> None:
    resp = await anon_client.post(
        "/api/v1/access-requests",
        json={
            "email": "new@test-admin.example",
            "name": "New Person",
            "motivation": "I love fitness.",
        },
    )
    assert resp.status_code == 201
    assert resp.json()["status"] == "submitted"


@pytest.mark.asyncio
async def test_access_request_duplicate_within_24h(anon_client: AsyncClient) -> None:
    payload = {
        "email": "dup@test-admin.example",
        "name": "Dup Person",
        "motivation": "Keen.",
    }
    r1 = await anon_client.post("/api/v1/access-requests", json=payload)
    assert r1.status_code == 201
    r2 = await anon_client.post("/api/v1/access-requests", json=payload)
    assert r2.status_code in (409, 429)


# ── Admin gating ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_admin_metrics_requires_admin(non_admin_client: AsyncClient) -> None:
    resp = await non_admin_client.get("/api/v1/admin/metrics")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_metrics_unauthenticated(anon_client: AsyncClient) -> None:
    resp = await anon_client.get("/api/v1/admin/metrics")
    assert resp.status_code == 401


# ── GET /api/v1/admin/metrics ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_admin_metrics_returns_summary(admin_client: AsyncClient) -> None:
    resp = await admin_client.get("/api/v1/admin/metrics")
    assert resp.status_code == 200
    data = resp.json()
    assert "cost_30d_usd" in data
    assert "interactions_30d" in data
    assert "budget_usd" in data
    assert isinstance(data["per_user"], list)
    assert isinstance(data["daily_costs"], list)


# ── GET /api/v1/admin/access-requests ────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_access_requests(admin_client: AsyncClient, anon_client: AsyncClient) -> None:
    await anon_client.post(
        "/api/v1/access-requests",
        json={
            "email": "list@test-admin.example",
            "name": "List Person",
            "motivation": "Why not.",
        },
    )
    resp = await admin_client.get("/api/v1/admin/access-requests?status=pending")
    assert resp.status_code == 200
    emails = [r["email"] for r in resp.json()]
    assert "list@test-admin.example" in emails


# ── PATCH /api/v1/admin/access-requests/{id} ─────────────────────────────────


@pytest.mark.asyncio
async def test_reject_access_request(admin_client: AsyncClient, anon_client: AsyncClient) -> None:
    await anon_client.post(
        "/api/v1/access-requests",
        json={
            "email": "reject@test-admin.example",
            "name": "Rejected",
            "motivation": "Try.",
        },
    )
    list_resp = await admin_client.get("/api/v1/admin/access-requests?status=pending")
    req = next(r for r in list_resp.json() if r["email"] == "reject@test-admin.example")

    patch_resp = await admin_client.patch(
        f"/api/v1/admin/access-requests/{req['id']}",
        json={"action": "rejected", "note": "Not a good fit."},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "rejected"


# ── GET /api/v1/admin/users ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_admin_users(admin_client: AsyncClient) -> None:
    resp = await admin_client.get("/api/v1/admin/users")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ── GET /api/v1/admin/invited-emails ─────────────────────────────────────────


@pytest.mark.asyncio
async def test_invited_emails_crud(admin_client: AsyncClient) -> None:
    # Add
    add_resp = await admin_client.post(
        "/api/v1/admin/invited-emails",
        json={"email": "invite@test-admin.example"},
    )
    assert add_resp.status_code == 201
    assert add_resp.json()["email"] == "invite@test-admin.example"

    # List
    list_resp = await admin_client.get("/api/v1/admin/invited-emails")
    assert list_resp.status_code == 200
    emails = [e["email"] for e in list_resp.json()]
    assert "invite@test-admin.example" in emails

    # Delete
    del_resp = await admin_client.delete("/api/v1/admin/invited-emails/invite@test-admin.example")
    assert del_resp.status_code == 204


# ── GET /api/v1/admin/health ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_admin_health(admin_client: AsyncClient) -> None:
    resp = await admin_client.get("/api/v1/admin/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "uptime_seconds" in data
    assert "errors_last_hour" in data
    assert isinstance(data["recent_errors"], list)


# ── GET /api/v1/admin/knowledge-base ─────────────────────────────────────────


@pytest.mark.asyncio
async def test_knowledge_base_list(admin_client: AsyncClient) -> None:
    resp = await admin_client.get("/api/v1/admin/knowledge-base")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
