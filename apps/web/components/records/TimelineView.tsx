"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PersonalRecord, E1RMPoint } from "@/lib/api";
import type { PRCategory } from "@/lib/records/categorise";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "@/lib/records/categorise";

interface Props {
  categorised: Record<PRCategory, PersonalRecord[]>;
  trendMap: Record<string, E1RMPoint[]>;
}

function TimelineMovementChart({
  name,
  points,
}: {
  name: string;
  points: E1RMPoint[];
}) {
  if (points.length < 2) {
    return (
      <p className="text-xs font-mono text-zinc-600 py-2">
        Not enough data to display
      </p>
    );
  }

  const data = points.map((p) => ({
    day: p.day.slice(5),
    e1rm: p.estimated_1rm_kg,
  }));

  return (
    <div aria-label={`PR progression for ${name}`} role="img">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, left: -28, bottom: 0 }}
        >
          <XAxis
            dataKey="day"
            tick={{ fill: "#52525b", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: "#52525b", fontSize: 10 }}
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
            dot={{ r: 3, fill: "#bc8cff", strokeWidth: 0 }}
            activeDot={{ r: 4 }}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TimelineView({ categorised, trendMap }: Props) {
  return (
    <div className="space-y-8">
      {CATEGORY_ORDER.map((cat) => {
        const prs = categorised[cat];
        if (!prs || prs.length === 0) return null;
        return (
          <section key={cat} className="border-t border-zinc-800 pt-6">
            <p className="text-sm font-mono text-zinc-400 mb-4">
              {CATEGORY_LABEL[cat]} / {prs.length} movements
            </p>
            <div className="space-y-6">
              {prs.map((pr) => {
                const points = (trendMap[pr.movement_id] ?? []).sort((a, b) =>
                  a.day.localeCompare(b.day),
                );
                return (
                  <div key={pr.movement_id}>
                    <p className="text-xs font-mono text-zinc-500 mb-1">
                      {pr.movement_name}
                    </p>
                    <TimelineMovementChart
                      name={pr.movement_name}
                      points={points}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
