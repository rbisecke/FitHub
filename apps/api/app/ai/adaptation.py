"""Adaptation generator: LLM-backed (stubbed in test/CI)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.ai.stub import stubbed

# ── Stub fixture ──────────────────────────────────────────────────────────────

STUB_ADAPTATION: dict[str, object] = {
    "rationale": (
        "Readiness has been low for 4+ consecutive days. "
        "Reducing intensity on hard sessions by 10-15% and adding an extra rest day."
    ),
    "diff": [
        {
            "session_title": "Heavy Squat Day",
            "change": "reduce_intensity",
            "load_pct_delta": -15,
            "notes": "Back off to 60% 1RM; prioritise movement quality over load.",
        }
    ],
    "stub": True,
}


# ── Structured output models ──────────────────────────────────────────────────


class AdaptationDiff(BaseModel):
    session_title: str
    change: Literal["reduce_intensity", "reduce_volume", "swap_session", "add_rest", "skip"]
    load_pct_delta: float | None = None
    volume_delta_sets: int | None = None
    notes: str


class AdaptationOutput(BaseModel):
    rationale: str = Field(..., min_length=20, max_length=500)
    diff: list[AdaptationDiff]


# ── Generator ─────────────────────────────────────────────────────────────────


@stubbed(STUB_ADAPTATION)
async def generate_adaptation(
    trigger: dict[str, object],
    affected_sessions: list[dict[str, object]],
    rationale_only: bool = False,
) -> dict[str, object]:
    """Generate a plan adaptation for the given trigger via LLM + instructor."""
    from app.ai.client import get_client
    from app.ai.errors import call_llm

    llm = get_client()

    trigger_type = str(trigger.get("trigger_type", "unknown"))
    trigger_data = trigger.get("trigger_data", {})

    sessions_text = "\n".join(
        f"- {s.get('title', 'Session')} ({s.get('session_type', '')})"
        f" day {s.get('day_offset', '?')} of week {s.get('week', '?')}"
        for s in affected_sessions[:10]
    )

    output: AdaptationOutput = await call_llm(
        llm.client.chat.completions.create(
            model=llm.model,
            max_tokens=1024,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a CrossFit coach adapting a training plan. "
                        "Be conservative: prefer reducing intensity over skipping sessions. "
                        "Rationale must be under 500 characters and athlete-friendly. "
                        "Diff entries must reference actual session titles from the input. "
                        "Valid change values: reduce_intensity, reduce_volume, "
                        "swap_session, add_rest, skip."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Trigger: {trigger_type}\n"
                        f"Trigger data: {trigger_data}\n\n"
                        f"Upcoming sessions:\n{sessions_text}\n\n"
                        "Propose adaptations."
                    ),
                },
            ],
            response_model=AdaptationOutput,
        ),
        context=f"generate_adaptation:{trigger_type}",
    )

    return {
        "rationale": output.rationale,
        "diff": [d.model_dump() for d in output.diff],
        "stub": False,
    }
