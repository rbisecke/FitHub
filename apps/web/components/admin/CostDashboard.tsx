import type { AdminMetricsSummary } from "@/lib/api";
import { CostHero } from "./CostHero";
import { MetricsCard } from "./MetricsCard";
import { TokenGrid } from "./TokenGrid";
import { CostChart } from "./CostChart";
import { TopUsersTable } from "./TopUsersTable";
import {
  formatCount,
  formatMs,
  formatPercent,
  formatUsd,
} from "@/lib/admin/cost-format";

/**
 * Cost / usage dashboard body (`08` §7). A deliberately restrained five-tier
 * hierarchy — hero, supporting stat cards, invoice breakdown, trend, per-user
 * list — with nothing else added. Each supporting card carries its own
 * visible time-window label since the metrics do NOT share one window
 * (`cost_mtd_usd` is calendar month-to-date; `error_rate_7d` is a 7-day
 * window; everything else is rolling 30-day).
 */
export function CostDashboard({ metrics }: { metrics: AdminMetricsSummary }) {
  const dailyAvg =
    metrics.daily_costs.length > 0
      ? metrics.daily_costs.reduce((sum, d) => sum + d.cost_usd, 0) /
        metrics.daily_costs.length
      : 0;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="type-h1 text-[var(--text)]">Cost &amp; usage</h1>
        <p className="type-small text-[var(--muted)]">
          LLM spend tracking and budget projection.
        </p>
      </div>

      <CostHero
        projectedMonthEndUsd={metrics.projected_month_end_usd}
        budgetUsd={metrics.budget_usd}
      />

      {/* Two explicit rows (4 + 3) sharing the same 4-column track so tile
          widths match between rows — row 2's 3rd cell is a hidden filler
          rather than letting that row's tiles stretch wider than row 1's
          (frontend-architect critique). */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricsCard
          label="Cost (rolling 30d)"
          value={formatUsd(metrics.cost_30d_usd)}
        />
        <MetricsCard
          label="Cost (month-to-date)"
          value={formatUsd(metrics.cost_mtd_usd)}
        />
        <MetricsCard
          label="Avg cost / interaction (30d)"
          value={formatUsd(metrics.avg_cost_per_interaction_usd)}
        />
        <MetricsCard
          label="Cache hit rate (30d)"
          value={formatPercent(metrics.cache_hit_rate)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricsCard
          label="Interactions (30d)"
          value={formatCount(metrics.interactions_30d)}
        />
        <MetricsCard
          label="TTFT p50/p95 (30d)"
          value={`${formatMs(metrics.ttft_p50_ms)}/${formatMs(
            metrics.ttft_p95_ms,
          )}`}
          valueFontSize={22}
        />
        <MetricsCard
          label="Error rate (7d)"
          value={formatPercent(metrics.error_rate_7d)}
        />
        <div aria-hidden="true" className="hidden md:block" />
      </div>

      <TokenGrid breakdown={metrics.token_breakdown} />

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-5">
        <CostChart data={metrics.daily_costs} dailyAvg={dailyAvg} />
      </div>

      <TopUsersTable users={metrics.per_user} />
    </div>
  );
}
