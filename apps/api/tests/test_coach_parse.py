"""Tests for POST /api/v1/coach/parse-log."""

from __future__ import annotations

import psycopg
import pytest
from httpx import AsyncClient

from tests.conftest import ALICE_ID, TEST_DB_DSN


@pytest.mark.asyncio
async def test_parse_log_stub_returns_fran(alice_client: AsyncClient) -> None:
    r = await alice_client.post("/api/v1/coach/parse-log", json={"text": "Fran 4:32"})
    assert r.status_code == 200
    data = r.json()
    assert data["stub"] is True
    assert data["parsed"]["title"] == "Fran"
    assert data["confidence"] == 0.95
    assert any(m["movement_name"] == "Thruster" for m in data["parsed"]["results"])


@pytest.mark.asyncio
async def test_parse_log_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.post("/api/v1/coach/parse-log", json={"text": "Fran"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_parse_log_empty_text_rejected(alice_client: AsyncClient) -> None:
    r = await alice_client.post("/api/v1/coach/parse-log", json={"text": ""})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_parse_log_too_long_rejected(alice_client: AsyncClient) -> None:
    r = await alice_client.post("/api/v1/coach/parse-log", json={"text": "x" * 2001})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_parse_log_writes_interaction_row(alice_client: AsyncClient) -> None:
    await alice_client.post("/api/v1/coach/parse-log", json={"text": "back squat 5x5"})

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        row = await conn.execute(
            """
            SELECT content FROM coach_interactions
            WHERE user_id = %s AND role = 'user'
            ORDER BY created_at DESC LIMIT 1
            """,
            [str(ALICE_ID)],
        )
        rec = await row.fetchone()

    assert rec is not None
    assert "back squat" in rec[0].lower()
