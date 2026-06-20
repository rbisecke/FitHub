"""Tests for the stub layer and STUB_LLM environment default."""

from __future__ import annotations

import asyncio
import os


def test_stub_env_default() -> None:
    """conftest sets STUB_LLM=true by default."""
    assert os.environ.get("STUB_LLM") == "true"


def test_stub_decorator_returns_fixture() -> None:
    from pydantic import BaseModel

    from app.ai.stub import stubbed

    class Foo(BaseModel):
        x: int

    fixture = Foo(x=42)

    @stubbed(fixture)
    async def my_fn() -> Foo:
        return Foo(x=99)  # never reached when STUB_LLM=true

    result = asyncio.run(my_fn())
    assert result.x == 42
    assert result is fixture


def test_stub_decorator_calls_real_when_not_stubbed(monkeypatch: object) -> None:
    from app.ai.stub import stubbed

    monkeypatch.setenv("STUB_LLM", "false")  # type: ignore[arg-type]

    from pydantic import BaseModel

    class Foo(BaseModel):
        x: int

    fixture = Foo(x=42)

    @stubbed(fixture)
    async def real_fn() -> Foo:
        return Foo(x=99)

    result = asyncio.run(real_fn())
    assert result.x == 99

    # Restore so subsequent tests in session still see STUB_LLM=true
    monkeypatch.setenv("STUB_LLM", "true")  # type: ignore[arg-type]
