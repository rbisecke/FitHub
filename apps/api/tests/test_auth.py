import time
import uuid
from collections.abc import Generator
from unittest.mock import MagicMock, patch

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric.ec import SECP256R1, generate_private_key
from httpx import ASGITransport, AsyncClient

from app.auth import UserContext, get_current_user
from app.config import Settings, get_settings
from app.main import app

ALICE_ID = uuid.UUID("00000001-0000-0000-0000-000000000001")
_TEST_ISS = "http://test.local:54321/auth/v1"


def _fake_settings() -> Settings:
    return Settings(
        supabase_url="http://test.local:54321",
        supabase_service_role_key="test-key",
        database_url="postgresql+psycopg://postgres:postgres@127.0.0.1:54322/postgres",
    )


@pytest.fixture(autouse=True)
def _setup_overrides() -> Generator[None]:
    app.dependency_overrides[get_settings] = _fake_settings
    yield
    app.dependency_overrides.pop(get_settings, None)


# ── EC key pair shared across JWT-specific tests ───────────────────────────────


@pytest.fixture(scope="module")
def ec_keys() -> tuple[object, object]:
    private_key = generate_private_key(SECP256R1())
    return private_key, private_key.public_key()


@pytest.fixture
def mock_jwks(ec_keys: tuple[object, object]) -> Generator[object]:
    """Patches _jwks_client so verify_jwt uses the test EC key pair."""
    private_key, public_key = ec_keys
    mock_client = MagicMock()
    # Return the raw EC public key — PyJWT accepts it directly for ES256.
    mock_client.get_signing_key_from_jwt.return_value = public_key
    with patch("app.auth._jwks_client", return_value=mock_client):
        yield private_key


def _sign(private_key: object, **overrides: object) -> str:
    payload: dict[str, object] = {
        "sub": str(ALICE_ID),
        "aud": "authenticated",
        "iss": _TEST_ISS,
        "exp": int(time.time()) + 3600,
        **overrides,
    }
    return jwt.encode(payload, private_key, algorithm="ES256")  # type: ignore[arg-type]


# ── Route-level tests ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_me_requires_auth() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_rejects_malformed_token() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_returns_user_id_for_valid_token() -> None:
    def _mock_user() -> UserContext:
        return UserContext(user_id=ALICE_ID)

    previous = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = _mock_user
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/me")
    finally:
        if previous is None:
            app.dependency_overrides.pop(get_current_user, None)
        else:
            app.dependency_overrides[get_current_user] = previous

    assert response.status_code == 200
    assert response.json() == {"user_id": str(ALICE_ID)}


# ── JWT claim validation tests ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_me_rejects_expired_token(mock_jwks: object) -> None:
    token = _sign(mock_jwks, exp=int(time.time()) - 10)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_rejects_wrong_issuer(mock_jwks: object) -> None:
    token = _sign(mock_jwks, iss="https://evil.example.com/auth/v1")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_rejects_wrong_audience(mock_jwks: object) -> None:
    token = _sign(mock_jwks, aud="service_role")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
