"""Adaptation generator: LLM-backed (stubbed in test/CI)."""

from __future__ import annotations

from app.ai.stub import stubbed

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


@stubbed(STUB_ADAPTATION)
async def generate_adaptation(
    trigger: dict[str, object],
    affected_sessions: list[dict[str, object]],
    rationale_only: bool = False,
) -> dict[str, object]:
    raise NotImplementedError("Real LLM adaptation generation — run with STUB_LLM=true")
