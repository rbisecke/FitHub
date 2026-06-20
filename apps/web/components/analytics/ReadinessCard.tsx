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

export function ReadinessCard({ data, acwr }: Props) {
  const cfg = LABEL_CONFIG[data.label] ?? LABEL_CONFIG["insufficient_data"]!;
  const pct = Math.round(data.score * 100);

  return (
    <div
      data-testid="readiness-card"
      className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
    >
      <div className="flex items-baseline justify-between mb-3">
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
    </div>
  );
}
