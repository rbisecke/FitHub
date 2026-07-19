"""Pydantic models for the adaptations router."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

_CHANGE_TYPE = Literal["reduce_intensity", "reduce_volume", "swap_session", "add_rest", "skip"]


class AdaptationItemChange(BaseModel):
    """One reviewable row in a session's diff: an exercise that's added, removed, or modified.

    Mirrors PlannedItemPatch's fields, doubled into an old/new pair so the frontend can
    render a GitHub-style red(old)/green(new) row without a second fetch. `old_*` fields
    are all None when this item is newly introduced (a pure "add" row); `new_*` fields are
    all None when the item is being removed (a pure "delete" row) — `removed` disambiguates
    that case from an item whose new state genuinely has every field null.
    """

    item_id: str | None = None
    movement_name: str
    item_order: int = 0

    old_sets: int | None = None
    old_reps: str | None = None
    old_load_pct_1rm: float | None = None
    old_load_kg: float | None = None
    old_notes: str | None = None

    new_sets: int | None = None
    new_reps: str | None = None
    new_load_pct_1rm: float | None = None
    new_load_kg: float | None = None
    new_notes: str | None = None

    # True for a real diff row (old != new, or a pure add/remove); False for a
    # context row carried through unchanged (old == new) so the reviewer sees
    # the changed items in the context of the whole session (design spec §8.5).
    changed: bool = True
    # True when this item existed before and is dropped entirely from the new
    # session content (e.g. a swap_session replacing the exercise list).
    removed: bool = False


class AdaptationSessionDiff(BaseModel):
    """One session's proposed change, with per-item before/after detail.

    `session_id` is the stable key the frontend uses for "Viewed" checklist state
    and to apply the change at merge time. `load_pct_delta`/`volume_delta_sets` are
    session-level aggregates (derived from item_changes) for the header magnitude bar;
    the per-item detail in item_changes is the source of truth for the diff rows.
    """

    session_id: str
    session_title: str
    scheduled_date: str | None = None
    change: _CHANGE_TYPE
    load_pct_delta: float | None = None
    volume_delta_sets: int | None = None
    notes: str
    item_changes: list[AdaptationItemChange] = Field(default_factory=list)


class AdaptationOut(BaseModel):
    id: str
    plan_id: str
    user_id: str
    trigger_type: Literal["high_acwr", "low_readiness", "missed_session", "rpe_creep"]
    trigger_data: dict[str, object]
    status: Literal["proposed", "merged", "rejected"]
    rationale: str | None = None
    rejection_reason: str | None = None
    diff_json: list[AdaptationSessionDiff] = Field(default_factory=list)
    stub: bool = False
    proposed_at: datetime | None = None
    merged_at: datetime | None = None
    rejected_at: datetime | None = None


class TriggerOut(BaseModel):
    type: str
    data: dict[str, object]


class DetectTriggersResponse(BaseModel):
    plan_id: str
    triggers: list[TriggerOut]
    proposed_adaptations: list[AdaptationOut]


class RejectAdaptationRequest(BaseModel):
    rejection_reason: str | None = Field(default=None, max_length=1000)


class AdjustAdaptationRequest(BaseModel):
    feedback: str = Field(..., min_length=5, max_length=1000)
