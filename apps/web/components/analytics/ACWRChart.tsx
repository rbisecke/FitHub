"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { DailyLoadPoint } from "@/lib/api";

interface Props {
  series: DailyLoadPoint[];
}

function fmtDay(day: string): string {
  return day.slice(5); // "MM-DD"
}

export function ACWRChart({ series }: Props) {
  const data = series
    .filter((_, i) => i % 3 === 0 || i === series.length - 1)
    .map((pt) => ({
      day: fmtDay(pt.day),
      acwr:
        pt.acwr !== null && pt.acwr !== undefined ? +pt.acwr.toFixed(2) : null,
      atl: +pt.atl.toFixed(1),
    }));

  return (
    <div data-testid="acwr-chart" className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
        >
          <XAxis
            dataKey="day"
            tick={{ fill: "#71717a", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval={6}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            domain={[0, 2]}
          />
          <Tooltip
            contentStyle={{
              background: "#18181b",
              border: "1px solid #27272a",
              borderRadius: 6,
              color: "#f4f4f5",
              fontSize: 12,
            }}
          />
          <ReferenceLine y={0.8} stroke="#71717a" strokeDasharray="4 2" />
          <ReferenceLine y={1.5} stroke="#f97316" strokeDasharray="4 2" />
          <Line
            type="monotone"
            dataKey="acwr"
            stroke="#06b6d4"
            dot={false}
            strokeWidth={2}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
