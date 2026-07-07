"""Rate limiting configuration for FitHub API."""

from __future__ import annotations

import os

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"


def _get_key(request: Request) -> str:
    return get_remote_address(request) or "unknown"


limiter = Limiter(
    key_func=_get_key,
    default_limits=["120/minute"],
    enabled=RATE_LIMIT_ENABLED,
)
