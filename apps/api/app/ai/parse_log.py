"""Natural-language workout log parser backed by an LLM + instructor."""

from __future__ import annotations

import uuid

import psycopg

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
                    "content": (
                        "You are a CrossFit workout log parser. "
                        "Return actual workout DATA extracted from the text — "
                        "NOT a JSON schema definition. "
                        "Never use '$defs', 'const', 'properties', 'required', or 'enum' keys. "
                        "Return real field values.\n\n"
                        "result_type must be exactly one of: "
                        "reps, time_s, distance_m, weight_kg, rounds, calories. "
                        "Use 'reps' for rep-based exercises (default when uncertain). "
                        "Use 'weight_kg' for max-effort single lifts with no rep count. "
                        "Use 'time_s' when a completion time is recorded. "
                        "Use 'distance_m' for running/rowing/cycling by distance. "
                        "Use 'rounds' for AMRAP results. "
                        "Use 'calories' for calorie-based efforts.\n\n"
                        "session_type must be exactly one of: "
                        "metcon, strength, skill, cardio, mixed, rest, unknown.\n\n"
                        "results may be an empty list [] if no specific exercise data is present. "
                        "Leave optional numeric fields null rather than guessing."
                    ),
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
