from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel

# ── Access requests ───────────────────────────────────────────────────────────


class AccessRequestCreate(BaseModel):
    email: str
    name: str
    motivation: str


class AccessRequestRow(BaseModel):
    id: uuid.UUID
    created_at: datetime
    email: str
    name: str
    motivation: str
    status: str
    reviewed_at: datetime | None
    reviewed_by: uuid.UUID | None
    review_note: str | None


class AccessRequestReview(BaseModel):
    action: str  # "approved" | "rejected"
    note: str | None = None


# ── Metrics summary ───────────────────────────────────────────────────────────


class UserCostRow(BaseModel):
    user_id: str
    display_name: str | None
    email: str | None
    interactions_30d: int
    cost_30d_usd: float


class DailyCostPoint(BaseModel):
    day: str  # ISO date string
    cost_usd: float


class MetricsSummary(BaseModel):
    cost_30d_usd: float
    cost_mtd_usd: float
    projected_month_end_usd: float
    avg_cost_per_interaction_usd: float
    cache_hit_rate: float
    ttft_p50_ms: int | None
    ttft_p95_ms: int | None
    error_rate_7d: float
    interactions_30d: int
    per_user: list[UserCostRow]
    daily_costs: list[DailyCostPoint]
    budget_usd: float


# ── User management ───────────────────────────────────────────────────────────


class AdminUser(BaseModel):
    user_id: str
    email: str | None
    display_name: str | None
    created_at: datetime | None
    banned_until: datetime | None
    interactions_30d: int


class InvitedEmail(BaseModel):
    id: uuid.UUID
    email: str
    invited_at: datetime
    used_at: datetime | None


class AddInviteBody(BaseModel):
    email: str


# ── Health ────────────────────────────────────────────────────────────────────


class RecentError(BaseModel):
    created_at: datetime
    path: str
    status_code: int
    error_type: str | None
    error_msg: str | None


class LLMError(BaseModel):
    created_at: datetime
    endpoint: str
    error_code: str | None
    error_msg: str | None


class AdminHealth(BaseModel):
    api_version: str
    uptime_seconds: float
    last_llm_call_at: datetime | None
    errors_last_hour: int
    recent_errors: list[RecentError]
    recent_llm_errors: list[LLMError]
    safety_trigger_count_7d: int


# ── Knowledge base ────────────────────────────────────────────────────────────


class KBEntry(BaseModel):
    id: uuid.UUID
    source_type: str
    title: str | None
    chunk_count: int
    last_indexed_at: datetime | None


class ReindexBody(BaseModel):
    source_type: str | None = None


class ReindexJob(BaseModel):
    job_id: str
    status: str
    message: str
