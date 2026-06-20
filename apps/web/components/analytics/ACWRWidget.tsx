"use client";

import Link from "next/link";
import { LineChart, Line, ResponsiveContainer, ReferenceLine } from "recharts";
import type { DailyLoadPoint } from "@/lib/api";

interface Props {
  series: DailyLoadPoint[];
  acwrNow: number | null;
  acwrZone: string;
}

const ZONE_LABEL: Record<string, { text: string; color: string }> = {
  sweet_spot: { text: "Optimal", color: "text-emerald-400" },
  undertraining: { text: "Room to increase", color: "text-amber-400" },
  caution: { text: "High load", color: "text-orange-400" },
  overreaching: { text: "Reduce intensity", color: "text-red-400" },
  insufficient_data: { text: "Not enough data", color: "text-zinc-500" },
};

export function ACWRWidget({ series, acwrNow, acwrZone }: Props) {
  const cfg = ZONE_LABEL[acwrZone] ?? ZONE_LABEL["insufficient_data"]!;

  const data = series
    .filter((pt) => pt.acwr !== null && pt.acwr !== undefined)
    .map((pt) => ({ acwr: +(pt.acwr as number).toFixed(2) }));

  return (
    <Link
      href="/analytics"
      data-testid="dashboard-acwr-widget"
      className="group block rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-700 transition-colors"
    >
      <p className="font-mono text-xs text-zinc-500 mb-2">ACWR</p>
      <div className="flex items-end gap-3">
        <div>
          <p className="text-2xl font-semibold text-zinc-100 leading-none">
            {acwrNow !== null ? acwrNow.toFixed(2) : "—"}
          </p>
          <span className={`text-xs font-medium mt-1 block ${cfg.color}`}>
            {cfg.text}
          </span>
        </div>
        <div className="flex-1 h-10 mb-5">
          {data.length >= 3 && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
              >
                <ReferenceLine y={0.8} stroke="#3f3f46" strokeWidth={1} />
                <ReferenceLine y={1.5} stroke="#3f3f46" strokeWidth={1} />
                <Line
                  type="monotone"
                  dataKey="acwr"
                  stroke="#06b6d4"
                  dot={false}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      <p className="font-mono text-xs text-zinc-600 mt-2 group-hover:text-zinc-500">
        → git diff --stat
      </p>
    </Link>
  );
}
