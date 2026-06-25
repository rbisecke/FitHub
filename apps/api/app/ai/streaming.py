"""SSE token-streaming for the coach router."""

from __future__ import annotations

import json
import re
from collections.abc import AsyncIterator

_STUB_TOKENS = [
    "I'm",
    "your",
    "AI",
    "coach.",
    "Ask",
    "me",
    "anything",
    "about",
    "programming,",
    "readiness,",
    "or",
    "movement.",
]

_SUSPICIOUS_OUTPUT = re.compile(
    r"(system\s+prompt|you\s+are\s+now|api\s+key|ignore\s+previous)",
    re.IGNORECASE,
)


async def stream_llm_tokens(
    messages: list[dict[str, str]],
    system_prompt: str,
) -> AsyncIterator[str]:
    """Yield raw text tokens; stub mode returns canned words without hitting the LLM."""
    from app.ai.stub import is_stubbed

    if is_stubbed():
        for word in _STUB_TOKENS:
            yield word + " "
        return

    from app.ai.client import get_client

    llm = get_client()

    if llm.backend == "anthropic":
        import anthropic

        raw = llm.raw
        assert isinstance(raw, anthropic.AsyncAnthropic)
        async with raw.messages.stream(
            model=llm.model,
            max_tokens=1024,
            system=system_prompt,
            messages=messages,  # type: ignore[arg-type]
        ) as stream:
            async for text in stream.text_stream:
                yield text
    else:
        from openai import AsyncOpenAI, AsyncStream
        from openai.types.chat import ChatCompletionChunk

        raw = llm.raw
        assert isinstance(raw, AsyncOpenAI)
        oai_stream: AsyncStream[ChatCompletionChunk] = await raw.chat.completions.create(  # type: ignore[assignment]
            model=llm.model,
            max_tokens=1024,
            messages=[{"role": "system", "content": system_prompt}] + messages,  # type: ignore[arg-type]
            stream=True,
        )
        async for chunk in oai_stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta


def sanitize_answer(text: str) -> str:
    if _SUSPICIOUS_OUTPUT.search(text):
        return "I'm not able to answer that question. Please rephrase."
    return text


def sse_event(data: dict[str, object]) -> str:
    return f"data: {json.dumps(data)}\n\n"
