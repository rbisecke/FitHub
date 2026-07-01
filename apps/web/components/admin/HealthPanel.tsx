"use client";

import { useState } from "react";
import type { AdminHealth, AdminRecentError } from "@/lib/api";

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function statusColor(code: number): React.CSSProperties {
  if (code >= 500) return { color: "#f85149", fontWeight: 700 };
  if (code >= 400) return { color: "#FFC83D", fontWeight: 700 };
  return { color: "#8b949e" };
}

// ── Error row ─────────────────────────────────────────────────────────────────

const GRID = "150px 1.4fr 60px 130px minmax(0,2fr)";

function ErrorRow({ error }: { error: AdminRecentError }) {
  return (
    <div
      style={{
        padding: "13px 20px",
        borderBottom: "1px solid #30363d",
        display: "grid",
        gridTemplateColumns: GRID,
        gap: 12,
        alignItems: "center",
        fontSize: 12,
      }}
    >
      <span
        style={{
          color: "#8b949e",
          fontFamily: "var(--font-jetbrains-mono), monospace",
          fontSize: 11,
        }}
      >
        {formatTimestamp(error.created_at)}
      </span>
      <span
        style={{
          color: "#58a6ff",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {error.path}
      </span>
      <span style={statusColor(error.status_code)}>{error.status_code}</span>
      <span style={{ color: "#8b949e" }}>{error.error_type ?? "—"}</span>
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          color: "#e6edf3",
        }}
      >
        {error.error_msg ?? "—"}
      </span>
    </div>
  );
}

// ── Uptime card ───────────────────────────────────────────────────────────────

function UptimeStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        background: "#161b22",
        border: "1px solid #30363d",
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          color: "#8b949e",
          textTransform: "uppercase",
          letterSpacing: ".5px",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-archivo-black), sans-serif",
          fontSize: 20,
          color: "#e6edf3",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function formatUptime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface Props {
  health: AdminHealth;
}

export function HealthPanel({ health }: Props) {
  // Collect unique paths for the filter dropdown
  const allPaths = Array.from(
    new Set(health.recent_errors.map((e) => e.path)),
  ).sort();

  const [endpointFilter, setEndpointFilter] = useState<string>("all");

  const filtered =
    endpointFilter === "all"
      ? health.recent_errors
      : health.recent_errors.filter((e) => e.path === endpointFilter);

  return (
    <div>
      {/* Summary stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 13,
          marginBottom: 20,
        }}
      >
        <UptimeStat
          label="Uptime"
          value={formatUptime(health.uptime_seconds)}
        />
        <UptimeStat
          label="Errors (last hour)"
          value={health.errors_last_hour}
        />
        <UptimeStat label="API version" value={health.api_version} />
      </div>

      {/* Endpoint filter row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 11.5,
            color: "#8b949e",
            fontFamily: "var(--font-jetbrains-mono), monospace",
          }}
        >
          Endpoint filter:
        </span>
        <select
          value={endpointFilter}
          onChange={(e) => setEndpointFilter(e.target.value)}
          style={{
            background: "#21262d",
            border: "1px solid #30363d",
            borderRadius: 9,
            color: "#e6edf3",
            fontSize: 12.5,
            padding: "8px 12px",
            cursor: "pointer",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            outline: "none",
          }}
        >
          <option value="all">All endpoints</option>
          {allPaths.map((path) => (
            <option key={path} value={path}>
              {path}
            </option>
          ))}
        </select>
        <span
          style={{
            fontSize: 11.5,
            color: "#8b949e",
            marginLeft: "auto",
            fontFamily: "var(--font-jetbrains-mono), monospace",
          }}
        >
          {filtered.length} event{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Error log table */}
      <div
        style={{
          background: "#161b22",
          border: "1px solid #30363d",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        {/* Column headers */}
        <div
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid #30363d",
            display: "grid",
            gridTemplateColumns: GRID,
            gap: 12,
            fontSize: 10.5,
            color: "#8b949e",
            textTransform: "uppercase",
            letterSpacing: ".5px",
          }}
        >
          <span>Timestamp</span>
          <span>Endpoint</span>
          <span>Status</span>
          <span>Error code</span>
          <span>Message</span>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div
            style={{
              padding: 44,
              textAlign: "center",
              color: "#8b949e",
              fontSize: 13,
            }}
          >
            No errors recorded.
          </div>
        ) : (
          filtered.map((error, i) => <ErrorRow key={i} error={error} />)
        )}
      </div>
    </div>
  );
}
