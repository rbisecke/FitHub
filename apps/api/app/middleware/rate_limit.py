"""Rate limiting configuration for FitHub API."""

from __future__ import annotations

import os
import uuid

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"

_TEST_USER_HEADER = "X-Test-User-Id"


def _get_key(request: Request) -> str:
    # Return a unique key per request in tests so limits never accumulate.
    if request.headers.get(_TEST_USER_HEADER):
        return f"test:{uuid.uuid4()}"
    return get_remote_address(request) or "unknown"


limiter = Limiter(
    key_func=_get_key,
    default_limits=["120/minute"],
    enabled=RATE_LIMIT_ENABLED,
)
