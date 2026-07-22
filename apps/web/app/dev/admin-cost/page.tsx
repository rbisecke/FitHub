import { ForcedTheme } from "@/components/shared/forced-theme";
import { CostDashboard } from "@/components/admin/CostDashboard";
import type { AdminMetricsSummary, AdminDailyCostPoint } from "@/lib/api";

/**
 * Dev-only preview (Effort 10, `08` §7). Renders the production
 * `CostDashboard` with synthetic fixtures — the admin console's real
 * `/admin/cost` route is gated behind `ADMIN_USER_IDS_CSV` (a FastAPI
 * process env var), which isn't configurable from an agent sandbox without
 * touching a denied `.env` file, so this preview is the only way to
 * screenshot the populated/over-budget states locally. Mirrors the
 * established `dev/load-model` multi-state mock-data pattern. Not part of
 * the shipping app.
 */
export default function DevAdminCostPreview() {
  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <div className="flex flex-col gap-10 py-6">
        <section>
          <p className="mb-2 px-4 font-mono text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">
            Empty — brand-new deployment, zero non-stub LLM calls
          </p>
          <CostDashboard metrics={EMPTY} />
        </section>

        <section>
          <p className="mb-2 px-4 font-mono text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">
            Populated — under budget
          </p>
          <CostDashboard metrics={UNDER_BUDGET} />
        </section>

        <section>
          <p className="mb-2 px-4 font-mono text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">
            Populated — over budget
          </p>
          <CostDashboard metrics={OVER_BUDGET} />
        </section>
      </div>
    </ForcedTheme>
  );
}

// ── Fixtures ──────────────────────────────────────────────────────────────

// Fixed anchor rather than `new Date()` — this preview's server render and
// client hydration pass can land on either side of a real calendar-day
// rollover, which produced a genuine hydration mismatch (a `new Date()`-based
// version disagreed on "today" between the two passes). A frozen anchor date
// is deterministic across any number of evaluations.
const ANCHOR = new Date(2026, 6, 22); // 2026-07-22, local

function isoDay(daysAgo: number): string {
  const d = new Date(ANCHOR);
  d.setDate(d.getDate() - daysAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildDailyCosts(
  seedBase: number,
  spikeDay?: number,
): AdminDailyCostPoint[] {
  const points: AdminDailyCostPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const wobble = Math.sin((29 - i) / 3) * 0.03;
    const spike = spikeDay != null && 29 - i === spikeDay ? 0.35 : 0;
    points.push({
      day: isoDay(i),
      cost_usd: Math.max(0, +(seedBase + wobble + spike).toFixed(4)),
    });
  }
  return points;
}

const EMPTY: AdminMetricsSummary = {
  cost_30d_usd: 0,
  cost_mtd_usd: 0,
  projected_month_end_usd: 0,
  avg_cost_per_interaction_usd: 0,
  cache_hit_rate: 0,
  ttft_p50_ms: null,
  ttft_p95_ms: null,
  error_rate_7d: 0,
  interactions_30d: 0,
  per_user: [],
  daily_costs: [],
  token_breakdown: [],
  budget_usd: 5.0,
};

const UNDER_BUDGET: AdminMetricsSummary = {
  cost_30d_usd: 4.83,
  cost_mtd_usd: 1.42,
  projected_month_end_usd: 4.58,
  avg_cost_per_interaction_usd: 0.00707,
  cache_hit_rate: 0.62,
  ttft_p50_ms: 410,
  ttft_p95_ms: 890,
  error_rate_7d: 0.012,
  interactions_30d: 683,
  per_user: [
    {
      user_id: "a1",
      display_name: "Jordan Reyes",
      email: null,
      interactions_30d: 214,
      cost_30d_usd: 1.62,
    },
    {
      user_id: "a2",
      display_name: "Priya Nandan",
      email: null,
      interactions_30d: 168,
      cost_30d_usd: 1.21,
    },
    {
      user_id: "a3",
      display_name: null,
      email: null,
      interactions_30d: 121,
      cost_30d_usd: 0.94,
    },
    {
      user_id: "a4",
      display_name: "Sam Okafor",
      email: null,
      interactions_30d: 98,
      cost_30d_usd: 0.63,
    },
    {
      user_id: "a5",
      display_name: "Lena Kowalski",
      email: null,
      interactions_30d: 82,
      cost_30d_usd: 0.43,
    },
  ],
  daily_costs: buildDailyCosts(0.14, 22),
  token_breakdown: [
    {
      token_type: "input",
      quantity: 2_180_000,
      unit_price_per_mtok: 1.0,
      charge_usd: 2.18,
    },
    {
      token_type: "output",
      quantity: 410_000,
      unit_price_per_mtok: 5.0,
      charge_usd: 2.05,
    },
    {
      token_type: "cache_read",
      quantity: 4_900_000,
      unit_price_per_mtok: 0.1,
      charge_usd: 0.49,
    },
    {
      token_type: "cache_write",
      quantity: 88_000,
      unit_price_per_mtok: 1.25,
      charge_usd: 0.11,
    },
  ],
  budget_usd: 5.0,
};

const OVER_BUDGET: AdminMetricsSummary = {
  ...UNDER_BUDGET,
  cost_30d_usd: 9.4,
  cost_mtd_usd: 6.85,
  projected_month_end_usd: 8.92,
  daily_costs: buildDailyCosts(0.29, 10),
};
