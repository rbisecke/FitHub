import { ForcedTheme } from "@/components/shared/forced-theme";
import { HealthPanel } from "@/components/admin/HealthPanel";
import { InfraPanel } from "@/components/admin/InfraPanel";
import type {
  AdminHealth,
  AdminInfraDashboard,
  AdminInfraHistoryPoint,
  AdminDeploymentEvent,
} from "@/lib/api";

/**
 * Dev-only preview (Effort 10, `08` §8). Renders the production
 * `HealthPanel` / `InfraPanel` with synthetic fixtures — the admin
 * console's real `/admin/infra` route is gated behind `ADMIN_USER_IDS_CSV`
 * (a FastAPI process env var not configurable from an agent sandbox
 * without touching a denied `.env` file), so this preview is the only way
 * to screenshot the populated/escalated/unknown-collector states locally.
 * Mirrors the established `dev/admin-cost` fixture-preview pattern.
 * Not part of the shipping app.
 */
export default function DevAdminInfraPreview() {
  return (
    <ForcedTheme
      theme="dark"
      className="min-h-svh bg-background text-foreground"
    >
      <div className="flex flex-col gap-12 py-6">
        <Section label="System health — quiet (no errors, safety stops at 0)">
          <HealthPanel health={HEALTH_QUIET} />
        </Section>

        <Section label="System health — escalated (safety stops amber, HTTP + LLM errors, endpoint filter)">
          <HealthPanel health={HEALTH_WARNING} />
        </Section>

        <Section label="System health — spike (safety stops red, errors_last_hour high)">
          <HealthPanel health={HEALTH_DANGER} />
        </Section>

        <Section label="Infrastructure — healthy, with deploy-marker overlay (one failed Railway deploy mid-window)">
          <InfraPanel dashboard={DASHBOARD_WITH_DEPLOYS} />
        </Section>

        <Section label="Infrastructure — unknown collector (infra call failed/timed out)">
          <InfraPanel dashboard={EMPTY_DASHBOARD} />
        </Section>

        <Section label="Infrastructure — known sources, no sparkline/deploy data yet">
          <InfraPanel dashboard={DASHBOARD_NO_HISTORY} />
        </Section>
      </div>
    </ForcedTheme>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="mb-3 px-4 font-mono text-[11px] uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <div className="px-4">{children}</div>
    </section>
  );
}

// ── Fixtures ──────────────────────────────────────────────────────────────

// Fixed anchor rather than `new Date()` — deterministic across server render
// and client hydration (the same hydration-mismatch hazard documented in
// `dev/admin-cost`'s fixture file).
const NOW = new Date("2026-07-22T15:00:00Z").getTime();

function minutesAgo(m: number): string {
  return new Date(NOW - m * 60_000).toISOString();
}

// ── HealthPanel fixtures ────────────────────────────────────────────────────

const HEALTH_QUIET: AdminHealth = {
  api_version: "",
  uptime_seconds: 12 * 3600 + 34 * 60,
  last_llm_call_at: null,
  errors_last_hour: 0,
  recent_errors: [],
  recent_llm_errors: [],
  safety_trigger_count_7d: 0,
};

const HEALTH_WARNING: AdminHealth = {
  api_version: "2026.7.22-a1b2c3",
  uptime_seconds: 3 * 3600 + 12 * 60,
  last_llm_call_at: minutesAgo(4),
  errors_last_hour: 6,
  recent_errors: [
    {
      created_at: minutesAgo(3),
      path: "/api/v1/coach/chat",
      status_code: 429,
      error_type: "RateLimitExceeded",
      error_msg: "10/minute limit exceeded for user",
    },
    {
      created_at: minutesAgo(9),
      path: "/api/v1/workouts",
      status_code: 500,
      error_type: "InternalServerError",
      error_msg: "psycopg.errors.UniqueViolation on workouts_pkey",
    },
    {
      created_at: minutesAgo(14),
      path: "/api/v1/analytics/load",
      status_code: 404,
      error_type: "NotFound",
      error_msg: "No load history for movement",
    },
    {
      created_at: minutesAgo(22),
      path: "/api/v1/coach/chat",
      status_code: 502,
      error_type: "BadGateway",
      error_msg: "Upstream LLM provider timeout",
    },
    {
      created_at: minutesAgo(31),
      path: "/api/v1/workouts",
      status_code: 500,
      error_type: "InternalServerError",
      error_msg: "psycopg.errors.UniqueViolation on workouts_pkey",
    },
    {
      created_at: minutesAgo(48),
      path: "/api/v1/plan/generate",
      status_code: 429,
      error_type: "RateLimitExceeded",
      error_msg: "3/hour limit exceeded for user",
    },
  ],
  recent_llm_errors: [
    {
      created_at: minutesAgo(4),
      endpoint: "/api/v1/coach/chat",
      error_code: "rate_limit_exceeded",
      error_msg: "Anthropic API rate limit hit — backing off",
    },
    {
      created_at: minutesAgo(22),
      endpoint: "/api/v1/coach/chat",
      error_code: null,
      error_msg: "Stream closed before completion — client disconnect",
    },
    {
      created_at: minutesAgo(48),
      endpoint: "/api/v1/plan/generate",
      error_code: "context_length_exceeded",
      error_msg: "Prompt exceeded max context window",
    },
  ],
  safety_trigger_count_7d: 2,
};

const HEALTH_DANGER: AdminHealth = {
  api_version: "2026.7.22-a1b2c3",
  uptime_seconds: 45 * 60,
  last_llm_call_at: minutesAgo(1),
  errors_last_hour: 14,
  recent_errors: [
    {
      created_at: minutesAgo(1),
      path: "/api/v1/coach/chat",
      status_code: 500,
      error_type: "InternalServerError",
      error_msg: "Unhandled exception in safety-tier classifier",
    },
    {
      created_at: minutesAgo(2),
      path: "/api/v1/coach/chat",
      status_code: 500,
      error_type: "InternalServerError",
      error_msg: "Unhandled exception in safety-tier classifier",
    },
  ],
  recent_llm_errors: [
    {
      created_at: minutesAgo(1),
      endpoint: "/api/v1/coach/chat",
      error_code: "internal_error",
      error_msg: "Anthropic API 500",
    },
  ],
  safety_trigger_count_7d: 7,
};

// ── InfraPanel fixtures ─────────────────────────────────────────────────────

function historyFor(
  metricKey: string,
  base: number,
  spikeAtMinutesAgo: number | null,
  spikeMagnitude: number,
): AdminInfraHistoryPoint[] {
  const points: AdminInfraHistoryPoint[] = [];
  for (let m = 60; m >= 0; m -= 2) {
    const wobble = Math.sin(m / 7) * (base * 0.08);
    // A spike decays over ~10 minutes after the triggering deploy, so the
    // marker visibly precedes and lines up with the metric's rise.
    const distanceFromSpike =
      spikeAtMinutesAgo != null ? spikeAtMinutesAgo - m : null;
    const spike =
      distanceFromSpike != null &&
      distanceFromSpike >= 0 &&
      distanceFromSpike <= 10
        ? spikeMagnitude * (1 - distanceFromSpike / 10)
        : 0;
    points.push({
      collected_at: minutesAgo(m),
      metrics: {
        [metricKey]: Math.max(0, +(base + wobble + spike).toFixed(2)),
      },
    });
  }
  return points;
}

const RAILWAY_FAILED_DEPLOY_MINUTES_AGO = 25;

const DEPLOYMENTS_WITH_FAILURE: AdminDeploymentEvent[] = [
  {
    id: "d-1",
    platform_id: "railway-svc-1",
    platform: "railway",
    service_name: "fithub-api",
    status: "READY",
    commit_sha: "9f2a3c1",
    commit_message: "fix: retry migration 0067 with IF NOT EXISTS guard",
    branch: "main",
    duration_ms: 41_000,
    error_message: null,
    occurred_at: minutesAgo(10),
  },
  {
    id: "d-2",
    platform_id: "railway-svc-1",
    platform: "railway",
    service_name: "fithub-api",
    status: "FAILED",
    commit_sha: "1a2b3c4",
    commit_message: "feat: add infra monitoring dashboard",
    branch: "main",
    duration_ms: 18_000,
    error_message:
      'Migration 0067_planned_sessions_index failed: relation "idx_planned_sessions_plan_id" already exists',
    occurred_at: minutesAgo(RAILWAY_FAILED_DEPLOY_MINUTES_AGO),
  },
  {
    id: "d-3",
    platform_id: "vercel-proj-1",
    platform: "vercel",
    service_name: "fithub-web",
    status: "READY",
    commit_sha: "1a2b3c4",
    commit_message: "feat: add infra monitoring dashboard",
    branch: "main",
    duration_ms: 52_000,
    error_message: null,
    occurred_at: minutesAgo(40),
  },
  {
    id: "d-4",
    platform_id: "vercel-proj-1",
    platform: "vercel",
    service_name: "fithub-web",
    status: "QUEUED",
    commit_sha: "7d8e9f0",
    commit_message: "chore: bump dependencies",
    branch: "main",
    duration_ms: null,
    error_message: null,
    // Outside the 1h sparkline window — exercises the "marker outside
    // window is omitted" clipping without disappearing from the
    // deployment list below (which isn't time-windowed, only count-sliced).
    occurred_at: minutesAgo(95),
  },
];

const DASHBOARD_WITH_DEPLOYS: AdminInfraDashboard = {
  current: [
    {
      source: "supabase",
      status: "degraded",
      metrics: {
        memory_used_pct: 58,
        disk_used_pct: 34,
        connections_active: 42,
        db_restarts_total: 1,
        load_1m: 1.8,
        gotrue_running: true,
      },
      checked_at: minutesAgo(1),
    },
    {
      source: "railway",
      status: "critical",
      metrics: {
        deploy_status: "FAILED",
        http_error_rate_pct: 6.2,
        http_p95_ms: 890,
      },
      checked_at: minutesAgo(1),
    },
    {
      source: "vercel",
      status: "healthy",
      metrics: {
        last_deploy_state: "READY",
        build_duration_ms: 52_000,
      },
      checked_at: minutesAgo(2),
    },
  ],
  history: {
    supabase: historyFor(
      "memory_used_pct",
      42,
      RAILWAY_FAILED_DEPLOY_MINUTES_AGO,
      14,
    ),
    railway: historyFor(
      "http_error_rate_pct",
      0.4,
      RAILWAY_FAILED_DEPLOY_MINUTES_AGO,
      6,
    ),
  },
  recent_deployments: DEPLOYMENTS_WITH_FAILURE,
};

const EMPTY_DASHBOARD: AdminInfraDashboard = {
  current: [],
  history: {},
  recent_deployments: [],
};

const DASHBOARD_NO_HISTORY: AdminInfraDashboard = {
  current: [
    {
      source: "supabase",
      status: "healthy",
      metrics: {
        memory_used_pct: 31,
        disk_used_pct: 22,
        connections_active: 8,
        db_restarts_total: 0,
        load_1m: 0.4,
        gotrue_running: true,
      },
      checked_at: minutesAgo(1),
    },
    {
      source: "railway",
      status: "healthy",
      metrics: {
        deploy_status: "READY",
        http_error_rate_pct: 0.1,
        http_p95_ms: 210,
      },
      checked_at: minutesAgo(1),
    },
    {
      source: "vercel",
      status: "healthy",
      metrics: {
        last_deploy_state: "READY",
        build_duration_ms: 38_000,
      },
      checked_at: minutesAgo(3),
    },
  ],
  history: { supabase: [], railway: [] },
  recent_deployments: [],
};
