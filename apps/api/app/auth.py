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
    Also touches `profiles.last_active_at` here — this dependency already runs
    on every authenticated request, so it's the natural place to record app
    activity for the nightly streak-at-risk job (app/jobs/gamification.py)
    without adding a second DB round-trip on every endpoint individually.
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
        # Only write when stale (NULL or >5 minutes old) — an unconditional
        # UPDATE on every single request would be wasteful, and a 5-minute
        # staleness window is still accurate enough for a once-a-day
        # "did they open the app today" check.
        await cur.execute(
            "UPDATE public.profiles SET last_active_at = now() "
            "WHERE id = %s "
            "AND (last_active_at IS NULL OR last_active_at < now() - interval '5 minutes')",
            [user.user_id],
        )
    return user
