"""Shared fixtures for integration tests against the local Supabase DB."""

from __future__ import annotations

import os
import subprocess

# Ensure LLM calls are never made during tests unless explicitly opted in
os.environ.setdefault("STUB_LLM", "true")

import uuid
from collections.abc import AsyncGenerator, Generator

import psycopg
import pytest
from fastapi import HTTPException, Request
from httpx import ASGITransport, AsyncClient

from app.auth import UserContext, get_current_user
from app.db import close_pool, init_pool
from app.main import app

# ── Ollama helpers ─────────────────────────────────────────────────────────────


def _ollama_running() -> bool:
    """Return True if a local Ollama server is reachable."""
    try:
        result = subprocess.run(
            ["curl", "-sf", "http://localhost:11434/api/tags"],
            capture_output=True,
            timeout=2,
        )
        return result.returncode == 0
    except Exception:
        return False


requires_ollama = pytest.mark.skipif(
    not _ollama_running(),
    reason="Ollama not running — start with `ollama serve` and pull mistral:7b",
)


@pytest.fixture
def ollama_env(monkeypatch: pytest.MonkeyPatch) -> Generator[None]:
    """Configure the process to use Ollama for LLM calls and reset after."""
    from app.ai import client as ai_client

    monkeypatch.setenv("STUB_LLM", "false")
    monkeypatch.setenv("LLM_BACKEND", "ollama")
    monkeypatch.setenv("OLLAMA_MODEL", "mistral:7b")
    monkeypatch.setenv("LLM_TIMEOUT_S", "300")  # plan generation can take 1-3 min on local Ollama
    ai_client.reset_client()
    yield
    ai_client.reset_client()


# ── Fixed test-user IDs (also used in pgTAP tests) ────────────────────────────
ALICE_ID = uuid.UUID("00000001-0000-0000-0000-000000000001")
BOB_ID = uuid.UUID("00000002-0000-0000-0000-000000000002")

# Plain postgresql:// URL — psycopg3 native, default local Supabase port
TEST_DB_DSN = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# Header used by test clients to identify the caller — read per-request so
# alice_client and bob_client can coexist in the same test without fighting
# over the app-level dependency_overrides dict.
_TEST_USER_HEADER = "X-Test-User-Id"


async def _header_auth(request: Request) -> UserContext:
    user_id_str = request.headers.get(_TEST_USER_HEADER)
    if user_id_str is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return UserContext(user_id=uuid.UUID(user_id_str))


# ── Pool (session-scoped) ──────────────────────────────────────────────────────
# ASGITransport does NOT trigger the FastAPI lifespan, so we initialise the
# global pool here instead.  get_db() then finds it as usual.


@pytest.fixture(scope="session", autouse=True)
async def _db_pool() -> AsyncGenerator[None]:
    await init_pool(TEST_DB_DSN)
    yield
    await close_pool()


# ── Auth override (session-scoped, single install) ─────────────────────────────


@pytest.fixture(scope="session", autouse=True)
def _install_auth_override() -> Generator[None]:
    app.dependency_overrides[get_current_user] = _header_auth
    yield
    app.dependency_overrides.pop(get_current_user, None)


# ── Seed Alice + Bob (session-scoped) ─────────────────────────────────────────


@pytest.fixture(scope="session", autouse=True)
async def _seed_users(_db_pool: None) -> None:
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await conn.execute(
            """
            INSERT INTO auth.users
                (id, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
            VALUES
                (%s, 'alice@test.local', now(), now(), '{}', '{}'),
                (%s, 'bob@test.local',   now(), now(), '{}', '{}')
            ON CONFLICT (id) DO NOTHING
            """,
            [ALICE_ID, BOB_ID],
        )
        await conn.execute(
            """
            INSERT INTO public.profiles (id, handle, display_name)
            VALUES
                (%s, 'alice_test', 'Alice Test'),
                (%s, 'bob_test',   'Bob Test')
            ON CONFLICT (id) DO NOTHING
            """,
            [ALICE_ID, BOB_ID],
        )


# ── Per-test cleanup ───────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
async def _clean_data() -> AsyncGenerator[None]:
    yield
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        # team_sessions CASCADE deletes participants; notifications are separate.
        await conn.execute(
            "DELETE FROM public.team_sessions WHERE created_by = ANY(%s::uuid[])",
            [[str(ALICE_ID), str(BOB_ID)]],
        )
        await conn.execute(
            "DELETE FROM public.notifications WHERE user_id = ANY(%s::uuid[])",
            [[str(ALICE_ID), str(BOB_ID)]],
        )
        # Results cascade from workouts; movements must be cleaned separately.
        await conn.execute(
            "DELETE FROM public.workouts WHERE user_id = ANY(%s::uuid[])",
            [[str(ALICE_ID), str(BOB_ID)]],
        )
        await conn.execute(
            "DELETE FROM public.movements WHERE created_by = ANY(%s::uuid[])",
            [[str(ALICE_ID), str(BOB_ID)]],
        )
        # Plans cascade: plan_tasks → plans → mesocycles/sessions/adaptations
        await conn.execute(
            "DELETE FROM public.plan_tasks WHERE user_id = ANY(%s::uuid[])",
            [[str(ALICE_ID), str(BOB_ID)]],
        )
        await conn.execute(
            "DELETE FROM public.plans WHERE user_id = ANY(%s::uuid[])",
            [[str(ALICE_ID), str(BOB_ID)]],
        )
        # Injuries
        await conn.execute(
            "DELETE FROM public.injuries WHERE user_id = ANY(%s::uuid[])",
            [[str(ALICE_ID), str(BOB_ID)]],
        )
        # AI / wearable tables
        await conn.execute(
            "DELETE FROM public.coach_interactions WHERE user_id = ANY(%s::uuid[])",
            [[str(ALICE_ID), str(BOB_ID)]],
        )
        await conn.execute(
            "DELETE FROM public.derived_metrics WHERE user_id = ANY(%s::uuid[])",
            [[str(ALICE_ID), str(BOB_ID)]],
        )
        await conn.execute(
            "DELETE FROM public.metric_samples WHERE user_id = ANY(%s::uuid[])",
            [[str(ALICE_ID), str(BOB_ID)]],
        )
        await conn.execute(
            "DELETE FROM public.data_connections WHERE user_id = ANY(%s::uuid[])",
            [[str(ALICE_ID), str(BOB_ID)]],
        )


# ── Authenticated HTTP clients ─────────────────────────────────────────────────
# Each client carries its user identity in a per-request header so that
# alice_client and bob_client can be used together in the same test without
# overwriting each other's app.dependency_overrides entry.


@pytest.fixture
async def alice_client(_seed_users: None) -> AsyncGenerator[AsyncClient]:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={_TEST_USER_HEADER: str(ALICE_ID)},
    ) as client:
        yield client


@pytest.fixture
async def bob_client(_seed_users: None) -> AsyncGenerator[AsyncClient]:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={_TEST_USER_HEADER: str(BOB_ID)},
    ) as client:
        yield client


@pytest.fixture
async def anon_client() -> AsyncGenerator[AsyncClient]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client
