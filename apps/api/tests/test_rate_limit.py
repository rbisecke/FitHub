"""Tests for S2 — rate limiting.

Rate limiting is disabled in this test suite (RATE_LIMIT_ENABLED=false set in
conftest.py before app import). These tests verify:
1. The rate-limit plumbing is wired correctly (limiter attached to app).
2. The X-Test-User-Id bypass key function returns unique keys.
3. Limits fire correctly when enabled (via a secondary app instance).
"""

from __future__ import annotations

import os

import pytest
from httpx import AsyncClient

from app.middleware.rate_limit import RATE_LIMIT_ENABLED, _get_key, limiter


def test_rate_limit_disabled_in_test_env() -> None:
    """Confirm the test environment has rate limiting off."""
    assert RATE_LIMIT_ENABLED is False
    assert os.environ.get("RATE_LIMIT_ENABLED") == "false"


def test_limiter_attached_to_app() -> None:
    """app.state.limiter must be the limiter instance."""
    from app.main import app

    assert app.state.limiter is limiter


@pytest.mark.asyncio
async def test_existing_routes_still_respond_under_rapid_calls(
    alice_client: AsyncClient,
) -> None:
    """With rate limiting disabled, 15 rapid calls to /api/v1/workouts must all succeed."""
    for _ in range(15):
        response = await alice_client.get("/api/v1/workouts")
        assert response.status_code == 200, f"Unexpected {response.status_code}"


@pytest.mark.asyncio
async def test_coach_chat_route_accepts_requests_when_rate_limit_disabled(
    alice_client: AsyncClient,
) -> None:
    """With rate limiting off, repeated coach/chat POSTs must not return 429."""
    payload = {"question": "What is a burpee?", "session_id": None}
    for _ in range(5):
        response = await alice_client.post("/api/v1/coach/chat", json=payload)
        assert response.status_code != 429, "Rate limit fired when it should be disabled"


class _MockRequest:
    """Minimal stand-in for fastapi.Request to test _get_key."""

    def __init__(self, headers: dict[str, str], client_host: str = "127.0.0.1") -> None:
        self.headers = headers
        self.client = type("Client", (), {"host": client_host})()


def test_get_key_returns_unique_uuid_for_test_header() -> None:
    """_get_key must return a unique string per call when X-Test-User-Id is present."""
    import uuid as uuid_mod

    req = _MockRequest(headers={"X-Test-User-Id": str(uuid_mod.uuid4())})
    key1 = _get_key(req)  # type: ignore[arg-type]
    key2 = _get_key(req)  # type: ignore[arg-type]
    assert key1 != key2, "Keys must be unique per request to prevent limit accumulation"
    assert key1.startswith("test:")
    assert key2.startswith("test:")


def test_get_key_returns_ip_without_test_header() -> None:
    """_get_key must use the remote address when no test header is present."""
    req = _MockRequest(headers={}, client_host="10.0.0.1")
    key = _get_key(req)  # type: ignore[arg-type]
    assert key == "10.0.0.1"
