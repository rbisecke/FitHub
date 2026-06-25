"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { tooltipContentStyle } from "@/lib/chart-utils";
import type { DailyLoadPoint } from "@/lib/api";

interface Props {
  series: DailyLoadPoint[];
}

const acwrConfig = {
  acwr: { label: "ACWR", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

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
    <ChartContainer
      config={acwrConfig}
      data-testid="acwr-chart"
      className="h-52 w-full min-w-0"
    >
      <LineChart
        data={data}
        margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
      >
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
        <Line
          type="monotone"
          dataKey="acwr"
          stroke="var(--color-acwr)"
          dot={false}
          strokeWidth={2}
          connectNulls
        />
      </LineChart>
    </ChartContainer>
  );
}
