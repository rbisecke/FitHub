"""Provider-agnostic instructor client factory.

Supported backends (LLM_BACKEND env var):
  anthropic  — Anthropic Claude via anthropic SDK (default)
  ollama     — Local Ollama via OpenAI-compat endpoint
  openai     — OpenAI or any OpenAI-compatible API

The model name travels with the client so call sites never hard-code
provider-specific model strings.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

import instructor
from instructor import AsyncInstructor


@dataclass(frozen=True)
class LLMClient:
    """Bundles an AsyncInstructor client with its model name.

    Call sites use:
        llm = get_client()
        result = await llm.client.chat.completions.create(model=llm.model, ...)
    """

    client: AsyncInstructor
    model: str


_instance: LLMClient | None = None


def get_client() -> LLMClient:
    """Return a shared LLMClient, constructed lazily and cached for the process lifetime."""
    global _instance
    if _instance is not None:
        return _instance
    _instance = _build_client()
    return _instance


def reset_client() -> None:
    """Force client reconstruction on next get_client() call.

    Use in tests to swap backends between test functions without process restart.
    """
    global _instance
    _instance = None


def _build_client() -> LLMClient:
    backend = os.getenv("LLM_BACKEND", "anthropic").lower()
    timeout = float(os.getenv("LLM_TIMEOUT_S", "30"))

    if backend == "ollama":
        return _build_ollama(timeout)
    if backend == "openai":
        return _build_openai(timeout)
    return _build_anthropic(timeout)


def _build_anthropic(timeout: float) -> LLMClient:
    import anthropic

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY is required when LLM_BACKEND=anthropic. "
            "Set STUB_LLM=true to skip LLM calls, or set LLM_BACKEND=ollama for local inference."
        )
    raw = anthropic.AsyncAnthropic(api_key=api_key, timeout=timeout)
    # max_retries is passed per-call via create(max_retries=...) — do not set here;
    # instructor v2's handle_kwargs would re-inject it into OpenAI kwargs, causing conflicts.
    client = instructor.from_anthropic(raw)
    model = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
    return LLMClient(client=client, model=model)


def _build_ollama(timeout: float) -> LLMClient:
    from openai import AsyncOpenAI

    host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    # max_retries=0: disable OpenAI-client-level timeout retries so a single
    # instructor attempt times out cleanly at LLM_TIMEOUT_S rather than
    # silently retrying (2 extra × timeout) before raising APITimeoutError.
    raw = AsyncOpenAI(base_url=f"{host}/v1", api_key="ollama", timeout=timeout, max_retries=0)
    # Ollama's OpenAI-compat layer does not support the `tools` parameter —
    # Mode.JSON is required; TOOLS mode returns a 400.
    client = instructor.from_openai(raw, mode=instructor.Mode.JSON)
    model = os.getenv("OLLAMA_MODEL", "mistral:7b")
    return LLMClient(client=client, model=model)


def _build_openai(timeout: float) -> LLMClient:
    from openai import AsyncOpenAI

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is required when LLM_BACKEND=openai")
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    raw = AsyncOpenAI(api_key=api_key, base_url=base_url, timeout=timeout)
    client = instructor.from_openai(raw, mode=instructor.Mode.TOOLS)
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    return LLMClient(client=client, model=model)
