"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { tooltipContentStyle } from "@/lib/chart-utils";
import type { WeeklyVolume } from "@/lib/api";

interface Props {
  weeks: WeeklyVolume[];
}

const volumeConfig = {
  strength: { label: "Strength", color: "hsl(var(--chart-1))" },
  metcon: { label: "Metcon", color: "hsl(var(--chart-2))" },
  endurance: { label: "Endurance", color: "hsl(var(--chart-3))" },
  skill: { label: "Skill", color: "hsl(var(--chart-4))" },
  recovery: { label: "Recovery", color: "hsl(var(--chart-5))" },
  other: { label: "Other", color: "var(--chart-axis)" },
} satisfies ChartConfig;

function barColor(st: string): string {
  return st in volumeConfig ? `var(--color-${st})` : "var(--chart-axis)";
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
    <ChartContainer
      config={volumeConfig}
      data-testid="volume-chart"
      className="h-52 w-full min-w-0"
    >
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="week"
          tick={{ fill: "var(--chart-axis)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fill: "var(--chart-axis)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip contentStyle={tooltipContentStyle} />
        <Legend wrapperStyle={{ fontSize: 11, color: "var(--chart-axis)" }} />
        {sessionTypes.map((st) => (
          <Bar
            key={st}
            dataKey={st}
            stackId="a"
            fill={barColor(st)}
            minPointSize={3}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
