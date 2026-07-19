"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  E1RMPoint,
  LastResult,
  Movement,
  MovementHistoryEntry,
  PersonalRecordResult,
} from "@/lib/api";
import type { ApiClient } from "@/lib/api/client";
import { formatWeight, relativeDate } from "@/lib/display";
import { formatTime } from "@/lib/time";
import { fmtDistance } from "@/lib/distance";
import { localDateKey, type DisplayUnits } from "@/lib/units";
import { PRSparkline } from "@/components/records/PRSparkline";

type ChartMetric = "e1rm" | "heaviest";

/** About tab (01 §9.2) — static movement metadata, not (implement,side)-scoped. */
export function AboutTab({ movement }: { movement: Movement }) {
  const rows: [string, string | null][] = [
    ["Base movement", movement.base_movement],
    ["Modality", label(movement.modality)],
    [
      "Pattern",
      movement.movement_pattern ? label(movement.movement_pattern) : null,
    ],
    ["Limb style", movement.limb_style ? label(movement.limb_style) : null],
    ["Implement", movement.implement],
    ["Default tempo", movement.tempo],
    [
      "Execution",
      movement.execution_style ? label(movement.execution_style) : null,
    ],
    ["Start position", movement.start_position],
    ["Catch position", movement.catch_position],
    ["Pause position", movement.pause_position],
  ];
  const shown = rows.filter(([, v]) => v);

  return (
    <dl className="flex flex-col gap-2">
      {shown.map(([k, v]) => (
        <div key={k} className="flex items-start justify-between gap-4">
          <dt
            className="font-sans text-[13px]"
            style={{ color: "var(--muted)" }}
          >
            {k}
          </dt>
          <dd
            className="text-right font-sans text-[13px]"
            style={{ color: "var(--text)" }}
          >
            {v}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** History tab (01 §9) — the scoped dated list of past results. */
export function HistoryTab({
  entries,
  state,
  units,
}: {
  entries: MovementHistoryEntry[];
  state: "loading" | "error" | "idle";
  units: DisplayUnits;
}) {
  if (state === "loading") return <Muted>Loading history…</Muted>;
  if (state === "error")
    return <Muted tone="error">Couldn&apos;t load history.</Muted>;
  if (entries.length === 0)
    return <Muted>No logs yet for this movement.</Muted>;

  return (
    <div className="flex flex-col">
      {entries.map((e, i) => (
        <div
          key={`${e.workout_id}-${e.date}-${i}`}
          className="flex items-center justify-between gap-3 py-2"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <span
            className="font-mono text-[12px]"
            style={{ color: "var(--muted)" }}
          >
            {relativeDate(localDateKey(e.date))}
          </span>
          <span className="flex items-center gap-2">
            <span
              className="font-mono tabular-nums text-[13px]"
              style={{ color: "var(--text)" }}
            >
              {e.load_kg != null ? formatWeight(e.load_kg, units.weight) : "—"}
              {e.reps != null ? ` × ${e.reps}` : ""}
            </span>
            {e.is_pr && (
              <span
                className="rounded-[4px] px-1 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  color: "var(--purple)",
                  border: "1px solid var(--purple)",
                }}
              >
                PR
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Charts tab (01 §9) — single-metric, single-series trend with a metric toggle. */
export function ChartsTab({
  entries,
  state,
  units,
}: {
  entries: MovementHistoryEntry[];
  state: "loading" | "error" | "idle";
  units: DisplayUnits;
}) {
  const [metric, setMetric] = useState<ChartMetric>("e1rm");

  // Derive both single series from the scoped history: one point per day, taking
  // the day's max for the selected metric (Bible 1.5 — one metric, one series).
  const points = useMemo<E1RMPoint[]>(() => {
    const byDay = new Map<string, number>();
    for (const e of entries) {
      const value = metric === "e1rm" ? e.estimated_1rm_kg : e.load_kg ?? null;
      if (value == null) continue;
      const day = e.date.slice(0, 10);
      byDay.set(day, Math.max(byDay.get(day) ?? -Infinity, value));
    }
    return [...byDay.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([day, v]) => ({ day, estimated_1rm_kg: v, workout_id: "" }));
  }, [entries, metric]);

  if (state === "loading") return <Muted>Loading chart…</Muted>;
  if (state === "error")
    return <Muted tone="error">Couldn&apos;t load chart.</Muted>;

  return (
    <div>
      <div
        className="mb-2 flex overflow-hidden rounded-[6px]"
        style={{ border: "1px solid var(--border)" }}
        role="group"
        aria-label="Chart metric"
      >
        {(
          [
            ["e1rm", "Estimated 1RM"],
            ["heaviest", "Heaviest Weight"],
          ] as [ChartMetric, string][]
        ).map(([m, lbl]) => {
          const selected = m === metric;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMetric(m)}
              aria-pressed={selected}
              className="min-h-[44px] flex-1 px-2 font-sans text-[12px]"
              style={{
                background: selected ? "var(--accent)" : "var(--bg)",
                color: selected ? "var(--bg)" : "var(--muted)",
              }}
            >
              {lbl}
            </button>
          );
        })}
      </div>
      <PRSparkline
        points={points}
        weightUnit={units.weight}
        metricLabel={metric === "e1rm" ? "e1RM" : "Heaviest"}
      />
    </div>
  );
}

/** Records tab (01 §9) — the scoped current PR and last result. */
export function RecordsTab({
  movementId,
  implement,
  side,
  units,
  client,
}: {
  movementId: string;
  implement: string | null;
  side: string | null;
  units: DisplayUnits;
  client: ApiClient;
}) {
  const [pr, setPr] = useState<PersonalRecordResult | null>(null);
  const [last, setLast] = useState<LastResult | null>(null);
  const [state, setState] = useState<"loading" | "error" | "idle">("loading");

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const params = {
      implement: implement ?? undefined,
      side: side ?? undefined,
    };
    // Defer the loading flag out of the effect body (no synchronous setState).
    Promise.resolve().then(() => {
      if (!cancelled) setState("loading");
    });
    Promise.all([
      client.movements.personalRecord(movementId, params, {
        signal: controller.signal,
      }),
      client.movements
        .lastResult(movementId, params, { signal: controller.signal })
        .catch(() => null),
    ])
      .then(([prRes, lastRes]) => {
        if (cancelled) return;
        setPr(prRes);
        setLast(lastRes);
        setState("idle");
      })
      .catch((err) => {
        if (!cancelled && !controller.signal.aborted) setState("error");
        void err;
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [client, movementId, implement, side]);

  if (state === "loading") return <Muted>Loading records…</Muted>;
  if (state === "error")
    return <Muted tone="error">Couldn&apos;t load records.</Muted>;
  if (!pr && !last) return <Muted>No logs yet for this movement.</Muted>;

  return (
    <div className="flex flex-col gap-3">
      {pr && (
        <RecordRow
          label="Current PR"
          value={simpleValue(pr, units)}
          extra={
            pr.estimated_1rm_kg
              ? `e1RM ${formatWeight(
                  Number(pr.estimated_1rm_kg),
                  units.weight,
                )}`
              : null
          }
          purple
        />
      )}
      {last && (
        <RecordRow
          label="Last result"
          value={simpleValue(last, units)}
          extra={relativeDate(localDateKey(last.performed_at))}
        />
      )}
    </div>
  );
}

function RecordRow({
  label,
  value,
  extra,
  purple = false,
}: {
  label: string;
  value: string;
  extra: string | null;
  purple?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-[10px] p-3"
      style={{
        background: "var(--surface)",
        border: `1px solid ${purple ? "var(--purple)" : "var(--border)"}`,
      }}
    >
      <span className="font-sans text-[12px]" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      <span className="text-right">
        <span
          className="block font-mono tabular-nums text-[14px]"
          style={{ color: "var(--text)" }}
        >
          {value}
        </span>
        {extra && (
          <span
            className="font-mono text-[11px]"
            style={{ color: "var(--muted)" }}
          >
            {extra}
          </span>
        )}
      </span>
    </div>
  );
}

interface SimpleResult {
  result_type: LastResult["result_type"];
  load_kg?: string | null;
  reps?: number | null;
  time_s?: number | null;
  distance_m?: string | null;
  rounds?: number | null;
  partial_reps?: number | null;
  calories?: number | null;
  watts?: number | null;
}

/** Compact value formatter for the PR/last subset (no full Result shape). */
function simpleValue(r: SimpleResult, units: DisplayUnits): string {
  switch (r.result_type) {
    case "weight": {
      const kg = r.load_kg != null ? Number(r.load_kg) : null;
      const w = kg != null ? formatWeight(kg, units.weight) : "";
      return kg != null && r.reps != null
        ? `${w} × ${r.reps}`
        : w || (r.reps != null ? `${r.reps} reps` : "—");
    }
    case "reps":
      return r.reps != null ? `${r.reps} reps` : "—";
    case "time":
      return r.time_s != null ? formatTime(r.time_s) : "—";
    case "distance":
      return r.distance_m != null
        ? fmtDistance(Number(r.distance_m), units.distance)
        : "—";
    case "calories":
      return r.calories != null ? `${r.calories} cal` : "—";
    case "rounds_reps":
      return r.rounds != null
        ? `${r.rounds}${r.partial_reps ? ` + ${r.partial_reps}` : ""} rounds`
        : "—";
    case "watts":
      return r.watts != null ? `${r.watts} W` : "—";
    default:
      return "—";
  }
}

function label(v: string): string {
  return v.replace(/_/g, " ");
}

function Muted({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "error";
}) {
  return (
    <p
      className="py-3 font-sans text-[13px]"
      style={{ color: tone === "error" ? "var(--red)" : "var(--muted)" }}
    >
      {children}
    </p>
  );
}
