from __future__ import annotations

import uuid
from functools import lru_cache
from typing import Annotated, Any

import jwt
import psycopg
from fastapi import Depends, HTTPException, Request, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from pydantic import BaseModel

from app.config import Settings, get_settings
from app.db import get_db

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
    request: Request,
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
        user = verify_jwt(credentials.credentials, settings)
        request.state.user_id = str(user.user_id)
        return user
    except (jwt.PyJWTError, jwt.PyJWKClientError, ValueError, KeyError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


async def require_invited(
    user: Annotated[UserContext, Depends(get_current_user)],
    conn: Annotated[psycopg.AsyncConnection[Any], Depends(get_db)],
) -> UserContext:
    """Reject any authenticated user whose email is not in the invited_emails allowlist.

    Runs on every authenticated request, closing the gap where OAuth users can
    bypass the before_user_created hook that guards email/magic-link signups.
    """
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT 1 FROM auth.users au "
            "JOIN public.invited_emails ie ON lower(ie.email) = lower(au.email) "
            "WHERE au.id = %s",
            [user.user_id],
        )
        if await cur.fetchone() is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not invited",
            )
    return user
