"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { WeeklyVolume } from "@/lib/api";

interface Props {
  weeks: WeeklyVolume[];
}

const SESSION_COLORS: Record<string, string> = {
  strength: "#06b6d4",
  metcon: "#f97316",
  endurance: "#a78bfa",
  skill: "#34d399",
  recovery: "#94a3b8",
};

function defaultColor(sessionType: string | null): string {
  if (sessionType === null) return "#71717a";
  return SESSION_COLORS[sessionType] ?? "#71717a";
}

export function VolumeChart({ weeks }: Props) {
  const sessionTypes = [
    ...new Set(weeks.map((w) => w.session_type ?? "other")),
  ];

  const weekMap: Record<string, Record<string, number | string>> = {};
  for (const w of weeks) {
    const key = w.week_start;
    weekMap[key] ??= { week: key.slice(5) };
    weekMap[key]![w.session_type ?? "other"] = w.total_load;
  }

  const data = Object.values(weekMap);

  return (
    <div data-testid="volume-chart" className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
        >
          <XAxis
            dataKey="week"
            tick={{ fill: "#71717a", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
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
          <Legend wrapperStyle={{ fontSize: 11, color: "#71717a" }} />
          {sessionTypes.map((st) => (
            <Bar
              key={st}
              dataKey={st}
              stackId="a"
              fill={defaultColor(st === "other" ? null : st)}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
