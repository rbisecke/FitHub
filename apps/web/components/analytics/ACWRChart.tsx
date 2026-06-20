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
  // Trim leading days with no ACWR data so the chart doesn't show weeks of blank space.
  const firstNonNull = series.findIndex(
    (pt) => pt.acwr !== null && pt.acwr !== undefined,
  );
  const trimmed =
    firstNonNull > 0 ? series.slice(Math.max(0, firstNonNull - 3)) : series;

  const data = trimmed
    .filter((_, i) => i % 2 === 0 || i === trimmed.length - 1)
    .map((pt) => ({
      day: fmtDay(pt.day),
      acwr:
        pt.acwr !== null && pt.acwr !== undefined ? +pt.acwr.toFixed(2) : null,
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
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            domain={([dataMin, dataMax]: readonly [number, number]) => [
              Math.max(0, +(dataMin * 0.85).toFixed(2)),
              +Math.max(dataMax * 1.15, 1.6).toFixed(2),
            ]}
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
