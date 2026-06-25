"use client";

import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import { useReducedMotion } from "motion/react";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { tooltipContentStyle } from "@/lib/chart-utils";
import type { DailyLoadPoint } from "@/lib/api";

interface Props {
  series: DailyLoadPoint[];
}

const acwrConfig = {
  acwr: { label: "ACWR", color: "var(--chart-1)" },
} satisfies ChartConfig;

function fmtDay(day: string): string {
  return day.slice(5); // "MM-DD"
}

export function ACWRChart({ series }: Props) {
  const prefersReducedMotion = useReducedMotion();
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

  // Highlight the latest point — keeps prior points quiet (design 08 §2).
  const latest = [...data].reverse().find((d) => d.acwr !== null);

  return (
    <ChartContainer
      config={acwrConfig}
      data-testid="acwr-chart"
      className="h-52 w-full min-w-0"
    >
      <AreaChart
        accessibilityLayer
        data={data}
        margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="acwrFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          stroke="var(--chart-border)"
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis
          dataKey="day"
          tick={{ fill: "var(--chart-axis)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: "var(--chart-axis)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          domain={([dataMin, dataMax]: readonly [number, number]) => [
            Math.max(0, +(dataMin * 0.85).toFixed(2)),
            +Math.max(dataMax * 1.15, 1.6).toFixed(2),
          ]}
        />
        <Tooltip contentStyle={tooltipContentStyle} />
        <ReferenceLine
          y={0.8}
          stroke="var(--chart-ref-lower)"
          strokeDasharray="4 2"
        />
        <ReferenceLine
          y={1.5}
          stroke="var(--chart-ref-danger)"
          strokeDasharray="4 2"
        />
        <Area
          type="monotone"
          dataKey="acwr"
          stroke="var(--color-acwr)"
          fill="url(#acwrFill)"
          fillOpacity={1}
          dot={false}
          strokeWidth={2}
          connectNulls
          isAnimationActive={!prefersReducedMotion}
        />
        {latest && (
          <ReferenceDot
            x={latest.day}
            y={latest.acwr as number}
            r={4}
            fill="var(--chart-1)"
            stroke="var(--bg)"
            strokeWidth={2}
          />
        )}
      </AreaChart>
    </ChartContainer>
  );
}
