"use client";

import type { ReadinessResponse } from "@/lib/api";

interface Props {
  data: ReadinessResponse;
  acwr?: number | null;
}

const LABEL_CONFIG: Record<string, { text: string; className: string }> = {
  optimal: { text: "Optimal", className: "text-emerald-400" },
  fresh: { text: "Fresh", className: "text-cyan-400" },
  high_load: { text: "High Load", className: "text-orange-400" },
  fatigued: { text: "Fatigued", className: "text-red-400" },
  insufficient_data: { text: "Insufficient Data", className: "text-zinc-500" },
};

const TIER_CONFIG: Record<
  string,
  { label: string; className: string; title: string }
> = {
  standard: {
    label: "28d baseline",
    className: "bg-emerald-900/40 text-emerald-400 border-emerald-800",
    title: "28+ days of HRV data — full confidence",
  },
  low_14_28: {
    label: "14–28d baseline",
    className: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
    title: "14–28 days of HRV data — building confidence",
  },
  calibrating_14d: {
    label: "Calibrating",
    className: "bg-zinc-800 text-zinc-400 border-zinc-700",
    title: "Less than 14 days of HRV data — still calibrating",
  },
};

function ConfidenceTierBadge({ tier }: { tier: string }) {
  const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG["calibrating_14d"]!;
  return (
    <span
      title={cfg.title}
      className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

function CoverageBar({ coverage }: { coverage: number }) {
  const pct = Math.round(coverage * 100);
  return (
    <div className="mt-2">
      <div className="mb-0.5 flex justify-between font-mono text-[10px] text-zinc-600">
        <span>Signal coverage</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full bg-cyan-700 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ReadinessCard({ data, acwr }: Props) {
  const cfg = LABEL_CONFIG[data.label] ?? LABEL_CONFIG["insufficient_data"]!;
  const pct = Math.round(data.score * 100);

  const hasWearable =
    data.recovery_score != null &&
    data.coverage != null &&
    data.confidence_tier != null;

  const hrvLabel =
    data.hrv_type === "hrv_sdnn"
      ? "HRV (SDNN)"
      : data.hrv_type === "hrv_rmssd"
        ? "HRV (RMSSD)"
        : "HRV";

  return (
    <div
      data-testid="readiness-card"
      className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
    >
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-sm font-medium text-zinc-300">Readiness</p>
        <span className={`text-sm font-medium ${cfg.className}`}>
          {cfg.text}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <p className="text-3xl font-bold text-zinc-100">{pct}%</p>
        <div className="flex-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-cyan-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
      <p className="mt-2 font-mono text-xs text-zinc-600">
        {acwr != null
          ? `Driven by ACWR ${acwr.toFixed(2)} and recent load`
          : "Based on recent training load"}
        {data.sleep_avg != null
          ? ` · Sleep ${data.sleep_avg.toFixed(1)}/7`
          : ""}
      </p>

      {hasWearable && (
        <div className="mt-3 border-t border-zinc-800 pt-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-mono text-xs text-zinc-500">
              {hrvLabel} recovery
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-200">
                {Math.round((data.recovery_score ?? 0) * 100)}%
              </span>
              <ConfidenceTierBadge tier={data.confidence_tier!} />
            </div>
          </div>
          <CoverageBar coverage={data.coverage ?? 0} />
        </div>
      )}
    </div>
  );
}
