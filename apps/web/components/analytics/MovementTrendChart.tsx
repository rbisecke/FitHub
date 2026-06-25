"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { tooltipContentStyle } from "@/lib/chart-utils";
import type { E1RMPoint } from "@/lib/api";

interface Props {
  movementId: string;
  token: string;
}

const trendConfig = {
  e1rm: { label: "Est. 1RM (kg)", color: "var(--chart-3)" },
} satisfies ChartConfig;

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
      <p className="font-mono text-xs text-[--muted] mt-1">Not enough data</p>
    );
  }

  const data = points.map((pt) => ({
    day: pt.day.slice(5),
    e1rm: +pt.estimated_1rm_kg.toFixed(1),
  }));

  return (
    <ChartContainer
      config={trendConfig}
      data-testid="movement-trend-chart"
      className="h-20 w-full mt-2 min-w-0"
    >
      <LineChart
        data={data}
        margin={{ top: 4, right: 4, left: -30, bottom: 0 }}
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
        <Tooltip contentStyle={tooltipContentStyle} />
        <Line
          type="monotone"
          dataKey="e1rm"
          stroke="var(--color-e1rm)"
          dot={false}
          strokeWidth={1.5}
        />
      </LineChart>
    </ChartContainer>
  );
}
