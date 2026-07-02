"""Request logging middleware — emits structured log per inbound HTTP request."""

from __future__ import annotations

import asyncio
import logging
import time
import uuid

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from app.db import pool_connection

log = logging.getLogger("fithub.requests")

_SILENT_PATHS = frozenset({"/health", "/openapi.json", "/docs", "/redoc"})


async def _write_error_event(
    *,
    user_id: str | None,
    path: str,
    method: str,
    status_code: int,
    request_id: str,
    duration_ms: int,
) -> None:
    try:
        async with pool_connection().connection() as db:
            await db.execute(
                """
                INSERT INTO error_events
                    (user_id, path, method, status_code,
                     request_id, duration_ms)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                [user_id, path, method, status_code, request_id, duration_ms],
            )
    except Exception:
        log.exception("Failed to write error_event row")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        start = time.perf_counter()

        response = await call_next(request)

        if request.url.path in _SILENT_PATHS:
            return response

        duration_ms = round((time.perf_counter() - start) * 1000)
        user_id_raw: str = getattr(request.state, "user_id", "anon")
        user_id: str | None = user_id_raw if user_id_raw != "anon" else None

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
                "user_id": user_id_raw,
            },
        )
        response.headers["X-Request-Id"] = request_id

        if response.status_code >= 500:
            asyncio.create_task(
                _write_error_event(
                    user_id=user_id,
                    path=request.url.path,
                    method=request.method,
                    status_code=response.status_code,
                    request_id=request_id,
                    duration_ms=duration_ms,
                )
            )

        return response
