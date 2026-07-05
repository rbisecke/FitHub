"""Natural-language workout log parser backed by an LLM + instructor."""

from __future__ import annotations

import uuid

import psycopg

from app.ai.prompts import PARSE_LOG_SYSTEM
from app.ai.stub import stubbed
from app.models.coach import ParsedLogEntry, ParseLogResponse


def _make_stub() -> ParseLogResponse:
    from app.models.coach import MovementResult

    return ParseLogResponse(
        parsed=ParsedLogEntry(
            title="Fran",
            session_type="metcon",
            workout_format="for_time",
            duration_s=272,
            session_rpe=9.0,
            results=[
                MovementResult(
                    movement_name="Thruster",
                    result_type="reps",
                    reps=21,
                    load_kg=42.5,
                ),
                MovementResult(
                    movement_name="Pull-up",
                    result_type="reps",
                    reps=21,
                    scaled=True,
                    notes="banded",
                ),
            ],
        ),
        confidence=0.95,
        stub=True,
    )


STUB_PARSE_LOG = _make_stub()


@stubbed(STUB_PARSE_LOG)
async def parse_log_text(
    text: str,
    *,
    user_id: uuid.UUID | None = None,
    db: psycopg.AsyncConnection[object] | None = None,
) -> ParseLogResponse:
    """Parse a free-text workout log into structured data via LLM + instructor."""
    from app.ai.client import get_client
    from app.ai.errors import call_llm

    llm = get_client()
    result: ParsedLogEntry = await call_llm(
        llm.client.chat.completions.create(
            model=llm.model,
            max_tokens=512,
            messages=[
                {
                    "role": "system",
                    "content": PARSE_LOG_SYSTEM,
                },
                {
                    "role": "user",
                    "content": f"Parse this workout log:\n\n{text}",
                },
            ],
            response_model=ParsedLogEntry,
        ),
        context="parse_log",
        user_id=user_id,
        db=db,
    )
    return ParseLogResponse(parsed=result, confidence=0.85, stub=False)
