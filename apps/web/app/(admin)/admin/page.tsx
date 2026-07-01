import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import type { AdminMetricsSummary } from "@/lib/api";
import { MetricsCard } from "@/components/admin/MetricsCard";
import { CostChart } from "@/components/admin/CostChart";
import { RagDonut } from "@/components/admin/RagDonut";
import { TokenGrid } from "@/components/admin/TokenGrid";
import { TopUsersTable } from "@/components/admin/TopUsersTable";

function fmtUsd(n: number): string {
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

function fmtMs(n: number | null): string {
  if (n == null) return "—";
  return String(n);
}

export default async function AdminMetricsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  let metrics: AdminMetricsSummary | null = null;
  try {
    metrics = await api.admin.metrics(session.access_token);
  } catch {
    // Render with null — surface error state below
  }

  const dailyAvg =
    metrics && metrics.daily_costs.length > 0
      ? metrics.cost_30d_usd / metrics.daily_costs.length
      : 0;

  return (
    <div
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        animation: "fadeUp .35s ease both",
      }}
    >
      {/* Section header */}
      <section>
        <div
          style={{
            fontSize: 13,
            color: "#4ADE80",
            marginBottom: 6,
            fontFamily: "var(--font-jetbrains-mono), monospace",
          }}
        >
          $ fithub metrics --window 30d
        </div>
        <h1
          style={{
            fontFamily: "var(--font-archivo-black), sans-serif",
            fontSize: 28,
            margin: "0 0 4px",
            letterSpacing: "-0.6px",
            color: "#e6edf3",
          }}
        >
          Metrics
        </h1>
        <p
          style={{
            color: "#8b949e",
            fontSize: 13,
            margin: "0 0 20px",
            fontFamily: "var(--font-jetbrains-mono), monospace",
          }}
        >
          LLM usage, cost, and performance — rolling 30-day window.
        </p>
      </section>

      {metrics == null ? (
        <div
          style={{
            padding: "44px",
            textAlign: "center",
            color: "#f85149",
            fontSize: 13,
            fontFamily: "var(--font-jetbrains-mono), monospace",
            background: "#161b22",
            border: "1px solid #30363d",
            borderRadius: 14,
          }}
        >
          Failed to load metrics. Check that the API is running and that
          ADMIN_USER_IDS is configured correctly.
        </div>
      ) : (
        <>
          {/* Stat cards — 4-column grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 13,
              marginBottom: 18,
            }}
          >
            <MetricsCard
              label="Cost (30d)"
              value={fmtUsd(metrics.cost_30d_usd)}
              subtext={`MTD: ${fmtUsd(metrics.cost_mtd_usd)}`}
            />
            <MetricsCard
              label="Interactions (30d)"
              value={metrics.interactions_30d.toLocaleString()}
              subtext={`avg ${fmtUsd(
                metrics.avg_cost_per_interaction_usd,
              )} / call`}
            />
            <MetricsCard
              label="TTFT p50"
              value={fmtMs(metrics.ttft_p50_ms)}
              unit={metrics.ttft_p50_ms != null ? "ms" : undefined}
              valueColor="#58a6ff"
              subtext={
                metrics.ttft_p95_ms != null
                  ? `p95: ${fmtMs(metrics.ttft_p95_ms)}ms`
                  : "p95: —"
              }
              trend="down"
            />
            <MetricsCard
              label="Cache hit rate"
              value={`${Math.round(metrics.cache_hit_rate * 100)}%`}
              subtext={`err rate (7d): ${(metrics.error_rate_7d * 100).toFixed(
                1,
              )}%`}
              trend="up"
            />
          </div>

          {/* Two-column row: cost chart + RAG donut */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1fr)",
              gap: 18,
              marginBottom: 18,
            }}
          >
            {/* Daily cost chart */}
            <div
              style={{
                background: "#161b22",
                border: "1px solid #30363d",
                borderRadius: 16,
                padding: 20,
              }}
            >
              <CostChart data={metrics.daily_costs} dailyAvg={dailyAvg} />
            </div>

            {/* RAG / cache hit donut */}
            <div
              style={{
                background: "#161b22",
                border: "1px solid #30363d",
                borderRadius: 16,
                padding: 20,
              }}
            >
              <RagDonut
                hitRate={metrics.cache_hit_rate}
                totalQueries={metrics.interactions_30d}
              />
            </div>
          </div>

          {/* Token totals */}
          <div
            style={{
              background: "#161b22",
              border: "1px solid #30363d",
              borderRadius: 16,
              padding: 20,
              marginBottom: 18,
            }}
          >
            <TokenGrid totals={null} />
          </div>

          {/* Most active users table */}
          <div
            style={{
              background: "#161b22",
              border: "1px solid #30363d",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <TopUsersTable users={metrics.per_user} />
          </div>
        </>
      )}
    </div>
  );
}
