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
  sweet_spot: { text: "Optimal", color: "text-[var(--green)]" },
  undertraining: { text: "Room to increase", color: "text-[var(--amber)]" },
  caution: { text: "High load", color: "text-[var(--amber)]" },
  overreaching: { text: "Reduce intensity", color: "text-[var(--red)]" },
  insufficient_data: { text: "Not enough data", color: "text-[var(--muted)]" },
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
      className="group block rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 hover:border-[var(--muted)] transition-colors"
    >
      <p className="font-mono text-xs text-[var(--muted)] mb-2">ACWR</p>
      <div className="flex items-end gap-3">
        <div>
          <p className="text-2xl font-semibold text-[var(--text)] leading-none">
            {acwrNow !== null ? acwrNow.toFixed(2) : "—"}
          </p>
          <span className={`text-xs font-medium mt-1 block ${cfg.color}`}>
            {cfg.text}
          </span>
        </div>
        <div className="flex-1 h-10 mb-5 min-w-0">
          {data.length >= 3 && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
              >
                <ReferenceLine
                  y={0.8}
                  stroke="var(--chart-ref-lower)"
                  strokeWidth={1}
                />
                <ReferenceLine
                  y={1.5}
                  stroke="var(--chart-ref-lower)"
                  strokeWidth={1}
                />
                <Line
                  type="monotone"
                  dataKey="acwr"
                  stroke="var(--chart-1)"
                  dot={false}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      <p className="font-mono text-xs text-[var(--muted)] mt-2">
        → git diff --stat
      </p>
    </Link>
  );
}
