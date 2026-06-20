"use client";

import type { ReadinessResponse } from "@/lib/api";

interface Props {
  data: ReadinessResponse;
}

const LABEL_CONFIG: Record<string, { text: string; className: string }> = {
  optimal: { text: "Optimal", className: "text-emerald-400" },
  fresh: { text: "Fresh", className: "text-cyan-400" },
  high_load: { text: "High Load", className: "text-orange-400" },
  fatigued: { text: "Fatigued", className: "text-red-400" },
  insufficient_data: { text: "Insufficient Data", className: "text-zinc-500" },
};

export function ReadinessCard({ data }: Props) {
  const cfg = LABEL_CONFIG[data.label] ?? LABEL_CONFIG["insufficient_data"]!;
  const pct = Math.round(data.score * 100);

  return (
    <div
      data-testid="readiness-card"
      className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
    >
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-xs text-zinc-500">Readiness</p>
        <span className={`text-sm font-medium ${cfg.className}`}>
          {cfg.text}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-4">
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
      {data.sleep_avg !== null && data.sleep_avg !== undefined && (
        <p className="mt-2 font-mono text-xs text-zinc-600">
          Sleep {data.sleep_avg.toFixed(1)}/7
        </p>
      )}
    </div>
  );
}
