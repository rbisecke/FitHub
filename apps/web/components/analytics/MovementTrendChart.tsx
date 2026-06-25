"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { useReducedMotion } from "motion/react";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { tooltipContentStyle } from "@/lib/chart-utils";
import { ChartEmpty } from "@/components/ui/chart-empty";
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
  const prefersReducedMotion = useReducedMotion();

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
    return <ChartEmpty className="mt-1" />;
  }

  const data = points.map((pt) => ({
    day: pt.day.slice(5),
    e1rm: +pt.estimated_1rm_kg.toFixed(1),
  }));

  // Gradient id must be unique per mounted instance (one chart per movement).
  const fillId = `e1rmFill-${movementId}`;

  return (
    <ChartContainer
      config={trendConfig}
      data-testid="movement-trend-chart"
      className="h-20 w-full mt-2 min-w-0"
    >
      <AreaChart
        accessibilityLayer
        data={data}
        margin={{ top: 4, right: 4, left: -30, bottom: 0 }}
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0} />
          </linearGradient>
        </defs>
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
        <Area
          type="monotone"
          dataKey="e1rm"
          stroke="var(--color-e1rm)"
          fill={`url(#${fillId})`}
          fillOpacity={1}
          dot={false}
          strokeWidth={1.5}
          isAnimationActive={!prefersReducedMotion}
        />
      </AreaChart>
    </ChartContainer>
  );
}
