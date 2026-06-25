"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { E1RMPoint } from "@/lib/api";

interface Props {
  points: E1RMPoint[];
}

export function PRSparkline({ points }: Props) {
  if (points.length < 2) {
    return (
      <p className="font-mono text-xs text-zinc-600 mt-1">
        Not enough PR history
      </p>
    );
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
            tick={{ fill: "#52525b", fontSize: 9 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: "#52525b", fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => `${v.toFixed(0)}`}
          />
          <Tooltip
            contentStyle={{
              background: "#161b22",
              border: "1px solid #30363d",
              borderRadius: 4,
              color: "#e6edf3",
              fontSize: 11,
            }}
            formatter={(value) =>
              typeof value === "number"
                ? [`${value.toFixed(1)} kg`, "e1RM"]
                : [String(value), "e1RM"]
            }
          />
          <Line
            type="monotone"
            dataKey="e1rm"
            stroke="#bc8cff"
            dot={{ r: 2, fill: "#bc8cff", strokeWidth: 0 }}
            activeDot={{ r: 3 }}
            strokeWidth={1.5}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
