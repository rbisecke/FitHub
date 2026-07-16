import { MetricsCard } from "@/components/admin/MetricsCard";
import type {
  AdminInfraDashboard,
  AdminInfraSnapshot,
  AdminInfraHistoryPoint,
  AdminDeploymentEvent,
} from "@/lib/api";

interface Props {
  dashboard: AdminInfraDashboard;
}

// ── Narrow helpers — metrics arrive as Record<string, unknown> from the API ──

function num(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function boolOrNull(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}

function pct(v: unknown): string {
  const n = num(v);
  return n != null ? `${n}%` : "—";
}

function ms(v: unknown): string {
  const n = num(v);
  return n != null ? `${n}ms` : "—";
}

const STATUS_COLOR: Record<AdminInfraSnapshot["status"], string> = {
  healthy: "var(--green)",
  degraded: "var(--amber)",
  critical: "var(--red)",
  unknown: "var(--muted)",
};

function deployStatusColor(status: string | null): string {
  if (status === "READY" || status === "SUCCESS") return "var(--green)";
  if (status === "ERROR" || status === "CRASHED" || status === "FAILED")
    return "var(--red)";
  if (status === "BUILDING" || status === "SLEEPING" || status === "QUEUED")
    return "var(--amber)";
  return "var(--muted)";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// ── Block header — status dot + section title ────────────────────────────────

function BlockHeader({
  title,
  status,
}: {
  title: string;
  status: AdminInfraSnapshot["status"];
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: STATUS_COLOR[status],
          flexShrink: 0,
        }}
      />
      <h2
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: "var(--text)",
          fontFamily: "var(--font-jetbrains-mono), monospace",
          margin: 0,
        }}
      >
        {title}
      </h2>
      <span
        style={{
          fontSize: 11,
          color: STATUS_COLOR[status],
          fontFamily: "var(--font-jetbrains-mono), monospace",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginLeft: 2,
        }}
      >
        {status}
      </span>
    </div>
  );
}

// ── Sparkline — minimal inline SVG line chart, no animation ──────────────────

function Sparkline({
  points,
  metricKey,
  label,
  height = 44,
  width = 100,
}: {
  points: AdminInfraHistoryPoint[];
  metricKey: string;
  label: string;
  height?: number;
  width?: number;
}) {
  const timestamps = points.map((p) => new Date(p.collected_at).getTime());
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  const timeRange = maxTime - minTime || 1;

  // Retain each point's real collection time alongside its value so the
  // x-position reflects actual elapsed time, not the index among survivors —
  // metrics like http_error_rate_pct can be null on rows with no active
  // deployment while collected_at is still a real timestamp.
  const series = points
    .map((p) => ({
      t: new Date(p.collected_at).getTime(),
      v: num(p.metrics[metricKey]),
    }))
    .filter((s): s is { t: number; v: number } => s.v != null);
  const values = series.map((s) => s.v);

  return (
    <div style={{ marginTop: 8 }}>
      <div
        style={{
          fontSize: 10,
          color: "var(--muted)",
          fontFamily: "var(--font-jetbrains-mono), monospace",
          marginBottom: 4,
          textTransform: "uppercase",
          letterSpacing: "0.4px",
        }}
      >
        {label} — last 1h
      </div>
      {values.length < 2 ? (
        <div
          style={{
            height,
            display: "flex",
            alignItems: "center",
            fontSize: 11,
            color: "var(--muted)",
            fontFamily: "var(--font-jetbrains-mono), monospace",
          }}
        >
          Not enough history yet — check back after a few collector cycles.
        </div>
      ) : (
        (() => {
          const min = Math.min(...values);
          const max = Math.max(...values);
          const range = max - min || 1;
          const coords = series
            .map(
              (s) =>
                `${((s.t - minTime) / timeRange) * width},${
                  height - ((s.v - min) / range) * height
                }`,
            )
            .join(" ");
          return (
            <svg
              width="100%"
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="none"
              height={height}
              role="img"
              aria-label={`${label} sparkline, ${
                values.length
              } data points, most recent ${values[values.length - 1]}`}
            >
              <polyline
                points={coords}
                fill="none"
                stroke="var(--blue)"
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          );
        })()
      )}
    </div>
  );
}

// ── Deployment list — shared between Vercel + Railway blocks ─────────────────

function DeploymentList({
  deployments,
}: {
  deployments: AdminDeploymentEvent[];
}) {
  if (deployments.length === 0) {
    return (
      <div
        style={{
          fontSize: 12,
          color: "var(--muted)",
          fontFamily: "var(--font-jetbrains-mono), monospace",
          padding: "12px 0 0",
        }}
      >
        No deployments recorded yet.
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        marginTop: 12,
      }}
    >
      {deployments.slice(0, 5).map((d) => (
        <div
          key={d.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11.5,
            color: "var(--muted)",
            fontFamily: "var(--font-jetbrains-mono), monospace",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: deployStatusColor(d.status),
              flexShrink: 0,
            }}
          />
          <span style={{ color: deployStatusColor(d.status), flexShrink: 0 }}>
            {d.status}
          </span>
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: "var(--text)",
            }}
          >
            {d.commit_message ?? d.branch ?? "—"}
          </span>
          <span style={{ marginLeft: "auto", flexShrink: 0 }}>
            {formatDate(d.occurred_at)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Blocks ────────────────────────────────────────────────────────────────────

function SupabaseBlock({
  snap,
  history,
}: {
  snap: AdminInfraSnapshot | undefined;
  history: AdminInfraHistoryPoint[];
}) {
  const m = snap?.metrics ?? {};
  const gotrue = boolOrNull(m.gotrue_running);
  const connectionsActive = num(m.connections_active);
  const dbRestartsTotal = num(m.db_restarts_total);
  const load1m = num(m.load_1m);

  return (
    <section style={{ marginBottom: 32 }}>
      <BlockHeader
        title="Supabase — Database"
        status={snap?.status ?? "unknown"}
      />
      <div
        className="admin-infra-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        <MetricsCard label="Memory used" value={pct(m.memory_used_pct)} />
        <MetricsCard label="Disk used" value={pct(m.disk_used_pct)} />
        <MetricsCard
          label="Active connections"
          value={connectionsActive != null ? String(connectionsActive) : "—"}
        />
        <MetricsCard
          label="DB restarts (total)"
          value={dbRestartsTotal != null ? String(dbRestartsTotal) : "—"}
        />
        <MetricsCard
          label="Load avg (1m)"
          value={load1m != null ? String(load1m) : "—"}
        />
        <MetricsCard
          label="Auth service"
          value={gotrue == null ? "—" : gotrue ? "Running" : "Down"}
          valueColor={
            gotrue == null ? undefined : gotrue ? "var(--green)" : "var(--red)"
          }
        />
      </div>
      <Sparkline
        points={history}
        metricKey="memory_used_pct"
        label="Memory %"
      />
    </section>
  );
}

function RailwayBlock({
  snap,
  history,
  deployments,
}: {
  snap: AdminInfraSnapshot | undefined;
  history: AdminInfraHistoryPoint[];
  deployments: AdminDeploymentEvent[];
}) {
  const m = snap?.metrics ?? {};
  const deployStatus = str(m.deploy_status);
  const errorRate = num(m.http_error_rate_pct);
  const railwayDeploys = deployments.filter((d) => d.platform === "railway");

  return (
    <section style={{ marginBottom: 32 }}>
      <BlockHeader title="Railway — API" status={snap?.status ?? "unknown"} />
      <div
        className="admin-infra-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        <MetricsCard
          label="Service status"
          value={deployStatus ?? "—"}
          valueColor={deployStatusColor(deployStatus)}
        />
        <MetricsCard
          label="HTTP error rate"
          value={errorRate != null ? `${errorRate}%` : "—"}
          valueColor={
            errorRate == null
              ? undefined
              : errorRate >= 5
                ? "var(--red)"
                : errorRate >= 1
                  ? "var(--amber)"
                  : "var(--green)"
          }
        />
        <MetricsCard label="p95 latency" value={ms(m.http_p95_ms)} />
      </div>
      <Sparkline
        points={history}
        metricKey="http_error_rate_pct"
        label="Error rate %"
      />
      <DeploymentList deployments={railwayDeploys} />
    </section>
  );
}

function VercelBlock({
  snap,
  deployments,
}: {
  snap: AdminInfraSnapshot | undefined;
  deployments: AdminDeploymentEvent[];
}) {
  const m = snap?.metrics ?? {};
  const deployState = str(m.last_deploy_state);
  const buildMs = num(m.build_duration_ms);
  const commitMessage = str(m.commit_message);
  const branch = str(m.branch);
  const commitSha = str(m.commit_sha);
  const vercelDeploys = deployments.filter((d) => d.platform === "vercel");

  return (
    <section style={{ marginBottom: 8 }}>
      <BlockHeader
        title="Vercel — Frontend"
        status={snap?.status ?? "unknown"}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 12,
        }}
      >
        <MetricsCard
          label="Last deploy"
          value={deployState ?? "—"}
          valueColor={deployStatusColor(deployState)}
        />
        <MetricsCard
          label="Build duration"
          value={buildMs != null ? `${Math.round(buildMs / 1000)}s` : "—"}
        />
      </div>
      {commitMessage && (
        <div
          style={{
            fontSize: 11.5,
            color: "var(--muted)",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            marginTop: 12,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {branch ?? "main"} · {commitSha ? commitSha.slice(0, 7) : "—"} —{" "}
          {commitMessage}
        </div>
      )}
      <DeploymentList deployments={vercelDeploys} />
    </section>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function InfraPanel({ dashboard }: Props) {
  const bySource = new Map(dashboard.current.map((s) => [s.source, s]));

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: 20,
      }}
    >
      <SupabaseBlock
        snap={bySource.get("supabase")}
        history={dashboard.history["supabase"] ?? []}
      />
      <RailwayBlock
        snap={bySource.get("railway")}
        history={dashboard.history["railway"] ?? []}
        deployments={dashboard.recent_deployments}
      />
      <VercelBlock
        snap={bySource.get("vercel")}
        deployments={dashboard.recent_deployments}
      />
    </div>
  );
}
