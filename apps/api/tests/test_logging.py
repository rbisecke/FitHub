"""Tests for S1 — structured request logging middleware."""

from __future__ import annotations

import logging

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_x_request_id_present_on_authenticated_request(alice_client: AsyncClient) -> None:
    """Every authenticated response must carry an X-Request-Id header."""
    response = await alice_client.get("/api/v1/workouts")
    assert "x-request-id" in response.headers
    rid = response.headers["x-request-id"]
    assert len(rid) == 36  # UUID format


@pytest.mark.asyncio
async def test_log_record_contains_structured_fields(
    alice_client: AsyncClient, caplog: pytest.LogCaptureFixture
) -> None:
    """Log record for an authenticated request must include request_id, user_id, status_code."""
    with caplog.at_level(logging.INFO, logger="fithub.requests"):
        response = await alice_client.get("/api/v1/workouts")

    assert response.status_code == 200
    records = [r for r in caplog.records if r.name == "fithub.requests"]
    assert records, "Expected at least one fithub.requests log record"

    rec = records[-1]
    assert hasattr(rec, "request_id")
    assert hasattr(rec, "user_id")
    assert hasattr(rec, "status_code")
    assert hasattr(rec, "duration_ms")
    assert rec.status_code == 200


@pytest.mark.asyncio
async def test_no_jwt_token_in_log_output(
    alice_client: AsyncClient, caplog: pytest.LogCaptureFixture
) -> None:
    """JWT tokens must never appear in any log output."""
    with caplog.at_level(logging.DEBUG):
        await alice_client.get("/api/v1/workouts")

    for record in caplog.records:
        msg = record.getMessage()
        # JWT tokens start with eyJ and are > 100 chars
        assert "eyJ" not in msg, f"Possible JWT found in log: {msg[:80]}..."


@pytest.mark.asyncio
async def test_health_endpoint_not_logged(
    alice_client: AsyncClient, caplog: pytest.LogCaptureFixture
) -> None:
    """/health is a silent path — must not produce a fithub.requests log record."""
    with caplog.at_level(logging.INFO, logger="fithub.requests"):
        await alice_client.get("/health")

    health_records = [
        r for r in caplog.records if r.name == "fithub.requests" and "/health" in r.getMessage()
    ]
    assert not health_records, "/health should be silenced in request logging"
