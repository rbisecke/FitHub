"""Request logging middleware — emits structured log per inbound HTTP request."""

from __future__ import annotations

import logging
import time
import uuid

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

log = logging.getLogger("fithub.requests")

_SILENT_PATHS = frozenset({"/health", "/openapi.json", "/docs", "/redoc"})


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        start = time.perf_counter()

        response = await call_next(request)

        if request.url.path in _SILENT_PATHS:
            return response

        duration_ms = round((time.perf_counter() - start) * 1000, 1)
        user_id: str = getattr(request.state, "user_id", "anon")

        log.info(
            "%s %s %d",
            request.method,
            request.url.path,
            response.status_code,
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "user_id": user_id,
            },
        )
        response.headers["X-Request-Id"] = request_id
        return response
