from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field

# ── Access requests ───────────────────────────────────────────────────────────


class AccessRequestCreate(BaseModel):
    email: EmailStr = Field(max_length=254)
    name: str = Field(max_length=200)
    motivation: str = Field(max_length=2000)


class AccessRequestRow(BaseModel):
    id: uuid.UUID
    created_at: datetime
    email: str
    name: str
    motivation: str
    status: Literal["pending", "approved", "rejected"]
    reviewed_at: datetime | None
    reviewed_by: uuid.UUID | None
    review_note: str | None


class AccessRequestReview(BaseModel):
    action: Literal["approved", "rejected"]
    note: str | None = Field(default=None, max_length=1000)


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
    email: EmailStr = Field(max_length=254)


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
    status: Literal["queued", "unknown"]
    message: str


class SubmitAccessRequestResponse(BaseModel):
    status: Literal["submitted"]


class MagicLinkResponse(BaseModel):
    link: str


# ── Infra monitoring ──────────────────────────────────────────────────────────


class InfraSnapshot(BaseModel):
    source: Literal["supabase", "vercel", "railway"]
    status: Literal["healthy", "degraded", "critical", "unknown"]
    metrics: dict[str, Any]
    checked_at: datetime


class InfraHistoryPoint(BaseModel):
    collected_at: datetime
    metrics: dict[str, Any]


class DeploymentEvent(BaseModel):
    id: uuid.UUID
    platform_id: str
    platform: Literal["vercel", "railway"]
    service_name: str
    status: str
    commit_sha: str | None
    commit_message: str | None
    branch: str | None
    duration_ms: int | None
    error_message: str | None
    occurred_at: datetime


class InfraDashboard(BaseModel):
    current: list[InfraSnapshot]
    history: dict[str, list[InfraHistoryPoint]]
    recent_deployments: list[DeploymentEvent]
