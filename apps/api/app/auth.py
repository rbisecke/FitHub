from __future__ import annotations

import uuid
from functools import lru_cache
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from pydantic import BaseModel

from app.config import Settings, get_settings

_bearer = HTTPBearer(auto_error=False)


class UserContext(BaseModel):
    user_id: uuid.UUID


@lru_cache(maxsize=4)
def _jwks_client(jwks_url: str) -> PyJWKClient:
    return PyJWKClient(jwks_url)


def verify_jwt(token: str, settings: Settings) -> UserContext:
    base = settings.supabase_url.rstrip("/")
    client = _jwks_client(f"{base}/auth/v1/.well-known/jwks.json")
    signing_key = client.get_signing_key_from_jwt(token)
    payload = jwt.decode(
        token,
        signing_key,
        algorithms=["ES256"],
        audience="authenticated",
        issuer=f"{base}/auth/v1",
    )
    return UserContext(user_id=uuid.UUID(payload["sub"]))


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Security(_bearer)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> UserContext:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return verify_jwt(credentials.credentials, settings)
    except (jwt.PyJWTError, jwt.PyJWKClientError, ValueError, KeyError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
