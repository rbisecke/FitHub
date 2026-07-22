import { MetricsCard } from "@/components/admin/MetricsCard";
import {
  STATUS_COLOR,
  deployStatusColor,
  isFailedDeployStatus,
} from "@/components/admin/infraStatusColors";
import { computeDeployMarkerX } from "@/components/admin/infraSparklineMarkers";
import { DeploymentErrorDetail } from "@/components/admin/DeploymentErrorDetail";
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
  checkedAt,
}: {
  title: string;
  status: AdminInfraSnapshot["status"];
  /** Static "as of {checked_at}" liveness cue (08 §8 Interactions, RESOLVED
   * 2026-07-18) — this collector's own last-poll timestamp, not a
   * live-refresh indicator. Absent when the source is unknown (never
   * collected this cycle). */
  checkedAt?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
        flexWrap: "wrap",
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
      {checkedAt && (
        <span
          style={{
            fontSize: 10.5,
            color: "var(--muted)",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            marginLeft: "auto",
          }}
        >
          as of {formatDate(checkedAt)}
        </span>
      )}
    </div>
  );
}

// ── Sparkline — minimal inline SVG line chart, no animation ──────────────────

function Sparkline({
  points,
  deployments,
  metricKey,
  label,
  height = 44,
  width = 100,
}: {
  points: AdminInfraHistoryPoint[];
  /** All recent deployments (both platforms) — overlaid as vertical dashed
   * markers so an operator can correlate "did this deploy cause the spike"
   * against this specific metric in one glance (08 §8; Railway-metrics
   * precedent). Not pre-filtered by platform: a Railway (API) deploy can
   * move Supabase's memory line just as plausibly as a Vercel deploy can
   * precede an API error-rate move, so every deploy is a candidate marker on
   * every sparkline — only its timestamp decides whether it falls in-window. */
  deployments: AdminDeploymentEvent[];
  metricKey: string;
  label: string;
  height?: number;
  width?: number;
}) {
  const timestamps = points.map((p) => new Date(p.collected_at).getTime());
  const minTime = points.length ? Math.min(...timestamps) : 0;
  const maxTime = points.length ? Math.max(...timestamps) : 0;
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
    // Extra top margin (vs. the metric-card grid above) and bottom margin
    // (vs. whatever follows — DeploymentList or the next section) so the
    // chart reads as its own "history" sub-panel rather than a continuation
    // of the "current state" card row (UI critique 2026-07-22).
    <div style={{ marginTop: 24, marginBottom: 20 }}>
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
          {points.length === 0
            ? "No data in the last hour."
            : "Not enough history yet — check back after a few collector cycles."}
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

          const markers = deployments
            .map((d) => {
              const x = computeDeployMarkerX(
                d.occurred_at,
                minTime,
                maxTime,
                width,
              );
              if (x == null) return null;
              return { id: d.id, x, failed: isFailedDeployStatus(d.status), d };
            })
            .filter((m): m is NonNullable<typeof m> => m != null);

          return (
            <svg
              width="100%"
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="none"
              height={height}
              role="img"
              aria-label={`${label} sparkline, ${
                values.length
              } data points, most recent ${values[values.length - 1]}${
                markers.length
                  ? `, ${markers.length} deploy event${
                      markers.length !== 1 ? "s" : ""
                    } in this window`
                  : ""
              }`}
            >
              {/* Deploy markers render behind the metric line so the line
                  itself stays the clearest element on top (08 §8: "keep
                  gridlines/ticks sparse"). Failed deploys get the danger
                  color — the single most likely candidate for "did this
                  cause the spike" — everything else is a neutral dashed
                  line, so the chart never exceeds the 2-3 color cap (§1.5,
                  accent line + muted marker + red-failed marker). `--muted`
                  (not `--border`) for the neutral marker — `--border` reads
                  as near-invisible against `--surface` and was blending into
                  the `--accent` polyline at their intersection, defeating
                  the entire "spot the deploy" purpose (UI critique
                  2026-07-22). */}
              {markers.map(({ id, x, failed, d }) => (
                <line
                  key={id}
                  x1={x}
                  x2={x}
                  y1={0}
                  y2={height}
                  stroke={failed ? "var(--red)" : "var(--muted)"}
                  strokeWidth={1}
                  strokeDasharray="3,3"
                  aria-hidden="true"
                >
                  <title>
                    {`${d.platform} deploy — ${d.status} — ${formatDate(
                      d.occurred_at,
                    )}`}
                  </title>
                </line>
              ))}
              <polyline
                points={coords}
                fill="none"
                stroke="var(--accent)"
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

// Non-color signal alongside the status text/dot/row-fill — a failed row's
// danger fill alone is decorative-only for anyone not distinguishing hue
// (UI critique 2026-07-22: pair color with a shape, not just text weight).
function deployStatusGlyph(status: string | null): string {
  if (isFailedDeployStatus(status)) return "✕ ";
  if (status === "READY" || status === "SUCCESS") return "✓ ";
  return "";
}

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
          padding: "16px 0 0",
          marginTop: 12,
          borderTop: "1px solid var(--border)",
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
        gap: 10,
        // A visible separator (not just a margin) so the list reads as
        // "deploy history" distinct from the chart above it, matching the
        // same separation added to the sparkline's own margins (UI critique
        // 2026-07-22).
        marginTop: 20,
        paddingTop: 16,
        borderTop: "1px solid var(--border)",
      }}
    >
      {deployments.slice(0, 5).map((d) => {
        const failed = isFailedDeployStatus(d.status);
        return (
          <div
            key={d.id}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              fontSize: 11.5,
              fontFamily: "var(--font-jetbrains-mono), monospace",
              // Full-card fill for a failed deploy (08 §8 States: "Deploy
              // failure ... full danger fill") — tints the whole row, not
              // just the status text (§1.4).
              ...(failed
                ? {
                    background:
                      "color-mix(in srgb, var(--red) 14%, transparent)",
                    border:
                      "1px solid color-mix(in srgb, var(--red) 38%, transparent)",
                    borderRadius: 8,
                    padding: "8px 10px",
                  }
                : { padding: "0 2px" }),
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
              <span
                style={{
                  color: deployStatusColor(d.status),
                  flexShrink: 0,
                  fontWeight: failed ? 700 : 400,
                }}
              >
                {deployStatusGlyph(d.status)}
                {d.status}
              </span>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: "var(--text)",
                }}
              >
                {d.commit_sha && (
                  <span style={{ color: "var(--muted)" }}>
                    {d.commit_sha.slice(0, 7)}{" "}
                  </span>
                )}
                {d.commit_message ?? d.branch ?? "—"}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  flexShrink: 0,
                  color: "var(--muted)",
                }}
              >
                {formatDate(d.occurred_at)}
              </span>
            </div>
            {d.error_message && (
              <DeploymentErrorDetail message={d.error_message} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Blocks ────────────────────────────────────────────────────────────────────

function SupabaseBlock({
  snap,
  history,
  deployments,
}: {
  snap: AdminInfraSnapshot | undefined;
  history: AdminInfraHistoryPoint[];
  deployments: AdminDeploymentEvent[];
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
        checkedAt={snap?.checked_at}
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
        deployments={deployments}
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
      <BlockHeader
        title="Railway — API"
        status={snap?.status ?? "unknown"}
        checkedAt={snap?.checked_at}
      />
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
        deployments={deployments}
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
  const vercelDeploys = deployments.filter((d) => d.platform === "vercel");

  return (
    <section style={{ marginBottom: 8 }}>
      <BlockHeader
        title="Vercel — Frontend"
        status={snap?.status ?? "unknown"}
        checkedAt={snap?.checked_at}
      />
      {/* 3 columns (not 2) so these cards line up edge-to-edge with the
          Supabase/Railway grids above — Vercel only has 2 metrics today,
          the grid just leaves the third track empty rather than stretching
          the two cards wide. The branch/commit/error detail that used to
          be duplicated here now lives solely in DeploymentList below, which
          already carries the same info (plus short SHA) in a git-log format
          shared with the Railway block. */}
      <div
        className="admin-infra-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
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
        deployments={dashboard.recent_deployments}
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
