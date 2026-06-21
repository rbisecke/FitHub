"""LLM kill switch — flip LLM_ENABLED=false in Railway to suspend AI calls instantly."""

from __future__ import annotations

import os

from fastapi import HTTPException


def require_llm_enabled() -> None:
    """Raise 503 if LLM_ENABLED=false. Use as a FastAPI dependency."""
    if os.getenv("LLM_ENABLED", "true").lower() == "false":
        raise HTTPException(
            status_code=503,
            detail="AI coaching is temporarily suspended. Please try again later.",
        )
