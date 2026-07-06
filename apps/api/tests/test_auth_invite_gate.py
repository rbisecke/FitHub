"""Integration tests for the invite-gate check (require_invited dependency).

Every authenticated endpoint uses require_invited via the Auth alias.
These tests verify the gate blocks users not in invited_emails and passes
those who are, without touching JWT verification logic (which is covered by
unit-level tests for verify_jwt).
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator

import psycopg
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from tests.conftest import _TEST_USER_HEADER, ALICE_ID, TEST_DB_DSN

# A user that exists in auth.users but is not in invited_emails.
_UNINVITED_ID = uuid.UUID("00000009-0000-0000-0000-000000000009")


@pytest.fixture
async def uninvited_client(_db_pool: None) -> AsyncGenerator[AsyncClient]:
    """Client for a user whose email is absent from invited_emails."""
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await conn.execute(
            """
            INSERT INTO auth.users
                (id, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
            VALUES (%s, 'uninvited@test.local', now(), now(), '{}', '{}')
            ON CONFLICT (id) DO NOTHING
            """,
            [_UNINVITED_ID],
        )

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={_TEST_USER_HEADER: str(_UNINVITED_ID)},
    ) as client:
        yield client

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await conn.execute("DELETE FROM auth.users WHERE id = %s", [_UNINVITED_ID])


@pytest.fixture
async def invited_client(_seed_users: None) -> AsyncGenerator[AsyncClient]:
    """Client for Alice, who is in invited_emails."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={_TEST_USER_HEADER: str(ALICE_ID)},
    ) as client:
        yield client


async def test_uninvited_user_is_rejected(uninvited_client: AsyncClient) -> None:
    response = await uninvited_client.get("/api/v1/profile")
    assert response.status_code == 403
    assert response.json()["detail"] == "Not invited"


async def test_invited_user_is_allowed(invited_client: AsyncClient) -> None:
    # Profile may or may not exist; either 200 or 404 is fine — 403 is not.
    response = await invited_client.get("/api/v1/profile")
    assert response.status_code != 403


async def test_unauthenticated_request_is_rejected(anon_client: AsyncClient) -> None:
    response = await anon_client.get("/api/v1/profile")
    assert response.status_code == 401
