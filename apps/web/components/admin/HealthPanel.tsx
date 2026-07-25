"use client";

import { useState } from "react";
import type { AdminHealth, AdminRecentError, AdminLLMError } from "@/lib/api";

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
  if (code >= 500) return { color: "var(--red)", fontWeight: 700 };
  if (code >= 400) return { color: "var(--amber)", fontWeight: 700 };
  return { color: "var(--muted)" };
}

// Only 3 columns: `error_type`/`error_msg` are never written by
// `RequestLoggingMiddleware`'s `error_events` INSERT (it only sets user_id,
// path, method, status_code, request_id, duration_ms) — every row in this
// table has always rendered "—" for both, so those two permanently-empty
// columns are dropped rather than kept as dead weight (UI review). LLM
// errors below are unaffected — `error_code`/`error_msg` there are real,
// written by `app/ai/usage.py`.
const HTTP_GRID = "150px 1fr 80px";
const LLM_GRID = "150px 1.6fr 140px minmax(0,2fr)";

function ErrorRow({ error }: { error: AdminRecentError }) {
  return (
    <div
      style={{
        padding: "13px 20px",
        borderBottom: "1px solid var(--border)",
        display: "grid",
        gridTemplateColumns: HTTP_GRID,
        gap: 12,
        alignItems: "center",
        fontSize: 12,
      }}
    >
      <span
        style={{
          color: "var(--muted)",
          fontFamily: "var(--font-jetbrains-mono), monospace",
          fontSize: 11,
        }}
      >
        {formatTimestamp(error.created_at)}
      </span>
      <span
        style={{
          color: "var(--accent)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {error.path}
      </span>
      <span style={statusColor(error.status_code)}>{error.status_code}</span>
    </div>
  );
}

// LLM errors carry no `status_code` (unlike HTTP `recent_errors`), so there's
// no severity class to grade the row-fill by — every entry here is already a
// realized error by definition. `error_code` being present vs. null is the
// only signal available: a coded failure is treated as the harder error
// (red), an uncoded one as still-worth-flagging but softer (amber), so the
// "same row-fill treatment" (08 §8) still reads as escalating severity
// rather than a single flat color for every row.
function llmErrorCodeColor(errorCode: string | null): React.CSSProperties {
  return errorCode
    ? { color: "var(--red)", fontWeight: 700 }
    : { color: "var(--amber)" };
}

function LLMErrorRow({ error }: { error: AdminLLMError }) {
  return (
    <div
      style={{
        padding: "13px 20px",
        borderBottom: "1px solid var(--border)",
        display: "grid",
        gridTemplateColumns: LLM_GRID,
        gap: 12,
        alignItems: "center",
        fontSize: 12,
      }}
    >
      <span
        style={{
          color: "var(--muted)",
          fontFamily: "var(--font-jetbrains-mono), monospace",
          fontSize: 11,
        }}
      >
        {formatTimestamp(error.created_at)}
      </span>
      <span
        style={{
          color: "var(--accent)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {error.endpoint}
      </span>
      <span style={llmErrorCodeColor(error.error_code)}>
        {error.error_code ?? "unclassified"}
      </span>
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          color: "var(--text)",
        }}
      >
        {error.error_msg ?? "—"}
      </span>
    </div>
  );
}

function UptimeStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          color: "var(--muted)",
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
          color: "var(--text)",
        }}
      >
        {value}
      </div>
      {hint && (
        <div
          style={{
            fontSize: 10.5,
            color: "var(--muted)",
            marginTop: 4,
            fontFamily: "var(--font-jetbrains-mono), monospace",
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

function formatUptime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

// Escalation thresholds for the safety-trigger card (08 §8: "escalates to
// the warning/danger color ... when non-trivial"). The spec doesn't pin an
// exact number, so these are a deliberate, documented judgment call: a
// single hard-stop in a week is plausibly the coach guardrail doing its job
// correctly on a genuinely risky input, not yet a pattern; a handful in the
// same week is worth an operator's attention; five or more in seven days
// reads as a spike (FR §4.5/§4.8 — "meant to be actionable"). Tune later
// against real usage data.
function safetyTriggerTone(count: number): {
  color: string;
  label: string;
} {
  if (count >= 5)
    return { color: "var(--red)", label: "Spike — review coach safety logs" };
  if (count >= 1) return { color: "var(--amber)", label: "Worth a look" };
  return { color: "var(--green)", label: "Nothing to review" };
}

function SafetyTriggerCard({ count }: { count: number }) {
  const { color, label } = safetyTriggerTone(count);
  const escalated = count >= 1;

  return (
    // This is the single highest-priority signal on the page — the only
    // place in the admin domain surfacing the coach's hard-stop guardrail
    // (08 §8) — so it needs more visual weight than an ordinary stat tile:
    // a left accent bar, larger count typography, and more padding than the
    // 4-up header grid above it (UI critique 2026-07-22: it read as "just
    // another tile" at the original size).
    <div
      style={{
        background: escalated
          ? `color-mix(in srgb, ${color} 16%, var(--surface))`
          : "var(--surface)",
        border: `1px solid ${
          escalated
            ? `color-mix(in srgb, ${color} 45%, transparent)`
            : "var(--border)"
        }`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 12,
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 20,
        marginBottom: 24,
        flexWrap: "wrap",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 12,
            // --muted is tuned for AA contrast against plain --surface, not
            // against this warmer amber-tinted card background (measured
            // ≈4.2:1 when escalated, under the 4.5:1 AA minimum for small
            // text) — --muted-strong is this codebase's existing
            // higher-contrast muted token for text on tinted/elevated
            // surfaces (see CostHero, TopUsersTable, MetricsCard).
            color: "var(--muted-strong)",
            textTransform: "uppercase",
            letterSpacing: ".5px",
            marginBottom: 5,
            fontWeight: 600,
          }}
        >
          Safety stops (7d) — AI-coach hard-stop guardrail triggers
        </div>
        <div style={{ fontSize: 12.5, color: "var(--muted-strong)" }}>
          {label}
        </div>
      </div>
      <div
        style={{
          fontFamily: "var(--font-archivo-black), sans-serif",
          fontSize: 44,
          color,
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        {count}
      </div>
    </div>
  );
}

interface Props {
  health: AdminHealth;
}

export function HealthPanel({ health }: Props) {
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
      {/* Compact header of process facts (08 §8: api_version, uptime_seconds
          honestly labeled, last_llm_call_at, errors_last_hour). */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 13,
          marginBottom: 16,
        }}
      >
        <UptimeStat label="API version" value={health.api_version || "dev"} />
        <UptimeStat
          label="Uptime (since restart)"
          value={formatUptime(health.uptime_seconds)}
          hint="Resets on deploy — not total availability"
        />
        <UptimeStat
          label="Last LLM call"
          value={
            health.last_llm_call_at
              ? formatTimestamp(health.last_llm_call_at)
              : "Never"
          }
        />
        <UptimeStat
          label="Errors (last hour)"
          value={health.errors_last_hour}
        />
      </div>

      {/* Dedicated, prominent card — the only place in the admin domain
          surfacing the coach's hard-stop guardrail (08 §8). */}
      <SafetyTriggerCard count={health.safety_trigger_count_7d} />

      {/* Recent HTTP errors */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <h3
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--text)",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            margin: 0,
          }}
        >
          Recent HTTP errors
        </h3>
      </div>
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
            color: "var(--muted)",
            fontFamily: "var(--font-jetbrains-mono), monospace",
          }}
        >
          Filter this window by endpoint:
        </span>
        <select
          value={endpointFilter}
          onChange={(e) => setEndpointFilter(e.target.value)}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 9,
            color: "var(--text)",
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
            color: "var(--muted)",
            marginLeft: "auto",
            fontFamily: "var(--font-jetbrains-mono), monospace",
          }}
        >
          {filtered.length} event{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          overflow: "hidden",
          marginBottom: 28,
        }}
      >
        <div
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid var(--border)",
            display: "grid",
            gridTemplateColumns: HTTP_GRID,
            gap: 12,
            fontSize: 10.5,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: ".5px",
          }}
        >
          <span>Timestamp</span>
          <span>Endpoint</span>
          <span>Status</span>
        </div>

        {filtered.length === 0 ? (
          <div
            style={{
              padding: 44,
              textAlign: "center",
              color: "var(--green)",
              fontSize: 13,
            }}
          >
            No errors in the last hour.
          </div>
        ) : (
          filtered.map((error, idx) => (
            <ErrorRow
              key={`${error.created_at}-${error.path}-${idx}`}
              error={error}
            />
          ))
        )}
      </div>

      {/* Recent LLM errors — same row-fill treatment as HTTP errors, no
          endpoint filter (spec only calls for the filter on recent_errors). */}
      <h3
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "var(--text)",
          fontFamily: "var(--font-jetbrains-mono), monospace",
          margin: "0 0 12px",
        }}
      >
        Recent LLM errors
      </h3>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid var(--border)",
            display: "grid",
            gridTemplateColumns: LLM_GRID,
            gap: 12,
            fontSize: 10.5,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: ".5px",
          }}
        >
          <span>Timestamp</span>
          <span>Endpoint</span>
          <span>Error code</span>
          <span>Message</span>
        </div>

        {health.recent_llm_errors.length === 0 ? (
          <div
            style={{
              padding: 44,
              textAlign: "center",
              color: "var(--green)",
              fontSize: 13,
            }}
          >
            No errors in the last hour.
          </div>
        ) : (
          health.recent_llm_errors.map((error, idx) => (
            <LLMErrorRow
              key={`${error.created_at}-${error.endpoint}-${idx}`}
              error={error}
            />
          ))
        )}
      </div>
    </div>
  );
}
