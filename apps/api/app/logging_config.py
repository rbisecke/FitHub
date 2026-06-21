"""Structured logging configuration for FitHub API."""

from __future__ import annotations

import logging
import logging.config
import os


class JSONFormatter(logging.Formatter):
    """Emit log records as single-line JSON in production."""

    def format(self, record: logging.LogRecord) -> str:
        import json
        import traceback

        payload: dict[str, object] = {
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "ts": self.formatTime(record, self.datefmt),
        }
        for key in ("request_id", "method", "path", "status_code", "duration_ms", "user_id"):
            if hasattr(record, key):
                payload[key] = getattr(record, key)

        if record.exc_info:
            payload["exc"] = traceback.format_exception(*record.exc_info)

        return json.dumps(payload)


def configure_logging() -> None:
    """Apply structured logging config based on APP_ENV."""
    app_env = os.getenv("APP_ENV", "development")

    if app_env == "production":
        formatter_class = "app.logging_config.JSONFormatter"
        fmt = None
    else:
        formatter_class = "logging.Formatter"
        fmt = "%(asctime)s [%(levelname)s] %(name)s - %(message)s"

    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "()": formatter_class,
                    **({"format": fmt} if fmt else {}),
                }
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "default",
                }
            },
            "root": {"level": "INFO", "handlers": ["console"]},
            "loggers": {
                "fithub": {"level": "INFO", "propagate": True},
                "uvicorn": {"level": "INFO", "propagate": False, "handlers": ["console"]},
                "uvicorn.error": {"level": "INFO", "propagate": False, "handlers": ["console"]},
                "uvicorn.access": {"level": "WARNING", "propagate": False, "handlers": ["console"]},
            },
        }
    )
