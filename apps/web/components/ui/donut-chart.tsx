"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useReducedMotion } from "motion/react";
import { tooltipContentStyle } from "@/lib/chart-utils";

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  className?: string;
  innerRadius?: number;
  outerRadius?: number;
  showLegend?: boolean;
}

export function DonutChart({
  data,
  className,
  innerRadius = 60,
  outerRadius = 90,
  showLegend = true,
}: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={className} style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart accessibilityLayer>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
            isAnimationActive={!prefersReducedMotion}
          >
            {data.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipContentStyle}
            formatter={(value, name) => [
              `${(((value as number) / total) * 100).toFixed(0)}%`,
              name,
            ]}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: 11, color: "var(--chart-axis)" }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
