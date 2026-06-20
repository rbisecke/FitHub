"use client";

import { useEffect, useState } from "react";
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
  movementId: string;
  token: string;
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function MovementTrendChart({ movementId, token }: Props) {
  const [points, setPoints] = useState<E1RMPoint[] | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/v1/analytics/movement-trend/${movementId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((data: E1RMPoint[]) => setPoints(data))
      .catch(() => setPoints([]));
  }, [movementId, token]);

  if (points === null) return null;

  if (points.length < 3) {
    return (
      <p className="font-mono text-xs text-zinc-600 mt-1">Not enough data</p>
    );
  }

  const data = points.map((pt) => ({
    day: pt.day.slice(5),
    e1rm: +pt.estimated_1rm_kg.toFixed(1),
  }));

  return (
    <div data-testid="movement-trend-chart" className="h-20 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 4, right: 4, left: -30, bottom: 0 }}
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
              background: "#18181b",
              border: "1px solid #27272a",
              borderRadius: 4,
              color: "#f4f4f5",
              fontSize: 11,
            }}
          />
          <Line
            type="monotone"
            dataKey="e1rm"
            stroke="#a78bfa"
            dot={false}
            strokeWidth={1.5}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
