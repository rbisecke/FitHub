"""Natural-language workout log parser backed by Claude + instructor."""

from __future__ import annotations

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
async def parse_log_text(text: str) -> ParseLogResponse:
    """Parse a free-text workout log into structured data via Claude + instructor."""
    from app.ai.client import get_client

    client = get_client()
    result: ParsedLogEntry = client.chat.completions.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": (
                    "Parse this workout log entry into structured JSON. "
                    "Infer movement names, loads, reps, and session type. "
                    f"Log: {text}"
                ),
            }
        ],
        response_model=ParsedLogEntry,
    )
    return ParseLogResponse(parsed=result, confidence=0.85, stub=False)
