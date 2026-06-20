"""Anthropic + instructor client, constructed lazily to avoid key errors in stub mode."""

from __future__ import annotations

import os

import anthropic
import instructor
from instructor import Instructor

_client: Instructor | None = None


def get_client() -> Instructor:
    """Return a shared instructor-wrapped Anthropic client.

    Raises RuntimeError if ANTHROPIC_API_KEY is not set and STUB_LLM != true.
    """
    global _client
    if _client is None:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            from app.ai.stub import is_stubbed

            if not is_stubbed():
                raise RuntimeError("ANTHROPIC_API_KEY is required when STUB_LLM is not set")
            api_key = "stub"
        _client = instructor.from_anthropic(anthropic.Anthropic(api_key=api_key))
    return _client
