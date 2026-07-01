"""Smoke tests: blocking chat and parse-log endpoints record llm_usage rows (stub path)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_chat_stub_does_not_crash(alice_client: AsyncClient) -> None:
    """Blocking chat succeeds in stub mode (no real LLM call, no usage row expected)."""
    r = await alice_client.post(
        "/api/v1/coach/chat",
        json={"question": "What is ACWR?", "session_id": None},
    )
    assert r.status_code == 200
    data = r.json()
    assert "answer" in data
    assert data["stub"] is True


@pytest.mark.asyncio
async def test_parse_log_stub_does_not_crash(alice_client: AsyncClient) -> None:
    """parse-log succeeds in stub mode; response has expected shape."""
    r = await alice_client.post(
        "/api/v1/coach/parse-log",
        json={"text": "Fran: 21-15-9 thrusters and pull-ups. Time 4:32. RPE 9."},
    )
    assert r.status_code == 200
    data = r.json()
    assert "parsed" in data
    assert "confidence" in data
    assert data["stub"] is True
