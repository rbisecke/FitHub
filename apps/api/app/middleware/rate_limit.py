"""Rate limiting configuration for FitHub API."""

from __future__ import annotations

import os

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"


def _get_key(request: Request) -> str:
    return get_remote_address(request) or "unknown"


def user_or_ip_key(request: Request) -> str:
    user_id = getattr(request.state, "user_id", None)
    if user_id:
        return f"user:{user_id}"
    forwarded = request.headers.get("x-forwarded-for")
    client_host = request.client.host if request.client else None
    return forwarded.split(",")[0].strip() if forwarded else (client_host or "unknown")


limiter = Limiter(
    key_func=_get_key,
    default_limits=["120/minute"],
    enabled=RATE_LIMIT_ENABLED,
)
