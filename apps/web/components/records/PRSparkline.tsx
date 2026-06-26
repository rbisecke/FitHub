"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { tooltipContentStyle } from "@/lib/chart-utils";
import { ChartEmpty } from "@/components/ui/chart-empty";
import type { E1RMPoint } from "@/lib/api";

interface Props {
  points: E1RMPoint[];
}

export function PRSparkline({ points }: Props) {
  if (points.length < 2) {
    return <ChartEmpty className="mt-1" message="Not enough PR history yet" />;
  }

  const data = points.map((p) => ({
    day: p.day.slice(5),
    e1rm: p.estimated_1rm_kg,
  }));

  return (
    <div aria-label="PR progression chart" role="img">
      <ResponsiveContainer width="100%" height={60}>
        <LineChart
          data={data}
          margin={{ top: 4, right: 4, left: -38, bottom: 0 }}
        >
          <XAxis
            dataKey="day"
            tick={{ fill: "var(--chart-axis)", fontSize: 9 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: "var(--chart-axis)", fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => `${v.toFixed(0)}`}
          />
          <Tooltip
            contentStyle={tooltipContentStyle}
            formatter={(value) =>
              typeof value === "number"
                ? [`${value.toFixed(1)} kg`, "e1RM"]
                : [String(value), "e1RM"]
            }
          />
          <Line
            type="monotone"
            dataKey="e1rm"
            stroke="var(--purple)"
            dot={{ r: 2, fill: "var(--purple)", strokeWidth: 0 }}
            activeDot={{ r: 3 }}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
