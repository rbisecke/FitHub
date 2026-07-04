"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useReducedMotion } from "motion/react";
import type {
  PersonalRecord,
  E1RMPoint,
  MovementHistoryEntry,
} from "@/lib/api";
import type { PRCategory } from "@/lib/records/categorise";
import { CATEGORY_LABEL } from "@/lib/records/categorise";
import { PeriodSelector } from "@/components/analytics/PeriodSelector";
import { tooltipContentStyle } from "@/lib/chart-utils";

const PERIOD_OPTIONS = [
  { label: "3M", value: "3M" },
  { label: "6M", value: "6M" },
  { label: "1Y", value: "1Y" },
  { label: "All", value: "all" },
];

const CAT_COLOR: Record<PRCategory, string> = {
  strength: "#58a6ff",
  gymnastics: "#bc8cff",
  metcon: "#FF7A45",
  endurance: "#4ADE80",
};

function filterByPeriod(points: E1RMPoint[], period: string): E1RMPoint[] {
  if (period === "all") return points;
  const days = period === "3M" ? 90 : period === "6M" ? 180 : 365;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return points.filter((p) => new Date(p.day + "T00:00:00") >= cutoff);
}

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

function fmtChartDay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function weeksAgoLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  return `${Math.floor(diffDays / 7)}w ago`;
}

interface ChartPoint {
  day: string;
  e1rm?: number;
  proj?: number;
}

function buildChartData(
  filtered: E1RMPoint[],
  pr: PersonalRecord,
): ChartPoint[] {
  const map = new Map<string, ChartPoint>();

  for (const pt of filtered) {
    map.set(pt.day, {
      day: pt.day,
      e1rm: +pt.estimated_1rm_kg.toFixed(1),
    });
  }

  if (pr.current_e1rm_kg != null && filtered.length > 0) {
    const lastPt = filtered[filtered.length - 1]!;
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    // Anchor the projection from the last actual data point so the lines connect
    const anchor = map.get(lastPt.day);
    if (anchor) {
      anchor.proj = anchor.e1rm;
    }

    // Add today's regression estimate (only if today is past the last data point)
    if (lastPt.day < todayStr) {
      const existing = map.get(todayStr);
      if (existing) {
        existing.proj = +pr.current_e1rm_kg.toFixed(1);
      } else {
        map.set(todayStr, {
          day: todayStr,
          proj: +pr.current_e1rm_kg.toFixed(1),
        });
      }
    }

    // 8-week future point
    let weeksOut = 8;
    let futureValue = pr.current_e1rm_kg;
    if (pr.next_pr_kg != null && pr.next_pr_weeks != null) {
      const slope = (pr.next_pr_kg - pr.current_e1rm_kg) / pr.next_pr_weeks;
      weeksOut = Math.min(pr.next_pr_weeks, 8);
      futureValue = pr.current_e1rm_kg + slope * weeksOut;
    }

    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + weeksOut * 7);
    const futureStr = futureDate.toISOString().slice(0, 10);
    map.set(futureStr, {
      day: futureStr,
      proj: +futureValue.toFixed(1),
    });
  }

  return Array.from(map.values()).sort((a, b) => a.day.localeCompare(b.day));
}

interface Props {
  pr: PersonalRecord;
  category: PRCategory;
  trendPoints: E1RMPoint[];
  history: MovementHistoryEntry[];
}

export function MovementDetailShell({
  pr,
  category,
  trendPoints,
  history,
}: Props) {
  const [period, setPeriod] = useState("3M");
  const prefersReducedMotion = useReducedMotion();
  const catColor = CAT_COLOR[category];
  const tagHref = `/log/tag?movement_id=${pr.movement_id}`;

  const filteredPoints = useMemo(
    () => filterByPeriod(trendPoints, period),
    [trendPoints, period],
  );

  const chartData = useMemo(
    () => buildChartData(filteredPoints, pr),
    [filteredPoints, pr],
  );

  const isEmpty = history.length === 0;
  const hasProjection = pr.current_e1rm_kg != null;

  // Header block (rendered in both columns on desktop, top on mobile)
  const headerBlock = (
    <div>
      <Link
        href="/records"
        className="inline-flex items-center gap-[6px] mb-[20px] md:mb-[24px]"
        style={{ color: "var(--muted)" }}
        aria-label="Back to records"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 6l-6 6 6 6" />
        </svg>
        <span className="font-data text-[11px]">records</span>
      </Link>

      <div className="flex items-center gap-[10px] mb-[10px]">
        <span
          className="inline-flex items-center text-[11px] font-semibold rounded-full px-[10px] py-[3px]"
          style={{
            background: `${catColor}1a`,
            color: catColor,
            border: `1px solid ${catColor}40`,
          }}
        >
          {CATEGORY_LABEL[category]}
        </span>
      </div>

      <h1
        className="font-heading leading-tight mb-[16px]"
        style={{ fontSize: "clamp(22px, 5vw, 34px)", color: "var(--text)" }}
        data-testid="movement-name"
      >
        {pr.movement_name}
      </h1>

      <div className="space-y-[6px] mb-[20px]">
        {/* All-time best */}
        <div className="flex items-baseline gap-[6px]">
          <span
            className="font-heading leading-none tabular-nums"
            style={{ fontSize: "clamp(34px, 7vw, 48px)", color: "var(--gold)" }}
            data-testid="best-e1rm"
          >
            {pr.best_1rm_kg.toFixed(1)}
          </span>
          <span
            className="font-mono text-[15px]"
            style={{ color: "var(--muted)" }}
          >
            kg
          </span>
          <span
            className="font-data text-[11px] ml-[4px]"
            style={{ color: "var(--muted)" }}
          >
            all-time best
          </span>
        </div>

        {/* Current estimate */}
        {pr.current_e1rm_kg != null && (
          <div className="flex items-baseline gap-[6px] flex-wrap">
            <span
              className="font-mono tabular-nums"
              style={{ fontSize: "20px", color: "var(--blue)" }}
            >
              {pr.current_e1rm_kg.toFixed(1)}
            </span>
            <span
              className="font-mono text-[12px]"
              style={{ color: "var(--muted)" }}
            >
              kg
            </span>
            <span
              className="font-data text-[11px] ml-[4px]"
              style={{ color: "var(--muted)" }}
            >
              est. now
            </span>
            {pr.is_stale && (
              <span
                className="font-mono text-[10px]"
                style={{ color: "var(--muted)" }}
              >
                · last logged {weeksAgoLabel(pr.achieved_at)}
              </span>
            )}
          </div>
        )}

        {/* Trend projection */}
        {pr.next_pr_kg != null && pr.next_pr_weeks != null && (
          <p
            className="font-mono italic text-[12px]"
            style={{ color: "var(--muted)" }}
          >
            on trend → {pr.next_pr_kg.toFixed(1)} kg in ~{pr.next_pr_weeks}wk
          </p>
        )}
      </div>

      <Link
        href={tagHref}
        className="inline-flex items-center gap-[6px] font-mono text-[12px] font-semibold px-[12px] py-[6px] rounded-md transition-colors"
        style={{
          border: "1px solid var(--blue)",
          color: "var(--blue)",
        }}
        data-testid="tag-link"
      >
        $ tag new set
      </Link>
    </div>
  );

  // Chart block
  const chartBlock = (
    <div>
      <div className="flex items-center justify-between mb-[16px]">
        <span
          className="font-data text-[12px] uppercase tracking-[0.5px]"
          style={{ color: "var(--muted)" }}
        >
          e1RM trend
        </span>
        <PeriodSelector
          options={PERIOD_OPTIONS}
          value={period}
          onChange={setPeriod}
          label="Chart period"
        />
      </div>

      {filteredPoints.length < 2 ? (
        <div
          className="rounded-[10px] flex items-center justify-center h-[180px] font-data text-[12px]"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--muted)",
          }}
        >
          {trendPoints.length === 0
            ? "No data yet — log your first set"
            : "Expand the period to see more data"}
        </div>
      ) : (
        <div aria-label={`e1RM trend chart for ${pr.movement_name}`}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="day"
                tickFormatter={fmtChartDay}
                tick={{
                  fill: "var(--muted)",
                  fontSize: 10,
                  fontFamily: "var(--font-geist-mono)",
                }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{
                  fill: "var(--muted)",
                  fontSize: 10,
                  fontFamily: "var(--font-geist-mono)",
                }}
                tickLine={false}
                axisLine={false}
                domain={["auto", "auto"]}
                tickFormatter={(v: number) => v.toFixed(0)}
              />
              <Tooltip
                contentStyle={tooltipContentStyle}
                labelFormatter={(label) =>
                  typeof label === "string" ? fmtChartDay(label) : String(label)
                }
                formatter={(value, name) => [
                  typeof value === "number"
                    ? `${value.toFixed(1)} kg`
                    : String(value),
                  name === "e1rm" ? "Est. 1RM" : "Projected",
                ]}
              />
              <Line
                type="monotone"
                dataKey="e1rm"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{ fill: "var(--accent)", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
                isAnimationActive={!prefersReducedMotion}
              />
              {hasProjection && (
                <Line
                  type="linear"
                  dataKey="proj"
                  stroke="var(--blue)"
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  dot={false}
                  activeDot={false}
                  connectNulls={true}
                  isAnimationActive={!prefersReducedMotion}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  // Set log table
  const tableBlock = (
    <div className="mt-[28px]">
      <div className="flex items-center gap-[9px] mb-[14px]">
        <span
          className="font-data text-[11px] uppercase tracking-[0.5px]"
          style={{ color: "var(--muted)" }}
        >
          logged sets
        </span>
        <span className="h-px flex-1" style={{ background: "var(--border)" }} />
        <span
          className="font-data text-[11px]"
          style={{ color: "var(--muted)" }}
        >
          {history.length} {history.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {isEmpty ? (
        <div className="text-center py-[40px]">
          <p
            className="font-data text-[13px] mb-[12px]"
            style={{ color: "var(--muted)" }}
          >
            No results logged yet
          </p>
          <Link
            href={tagHref}
            className="font-mono text-[12px] font-semibold px-[12px] py-[6px] rounded-md transition-colors"
            style={{ border: "1px solid var(--blue)", color: "var(--blue)" }}
          >
            $ tag your first set
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" data-testid="sets-table">
            <thead>
              <tr>
                {["Date", "Load", "Reps", "Est. 1RM", "Note"].map((h) => (
                  <th
                    key={h}
                    className="font-data text-left pb-[8px] pr-[16px]"
                    style={{
                      fontSize: 10,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((row, i) => (
                <tr
                  key={`${row.workout_id}-${i}`}
                  style={
                    row.is_pr
                      ? { background: "rgba(255,200,61,0.04)" }
                      : undefined
                  }
                >
                  <td
                    className="font-data tabular-nums py-[8px] pr-[16px]"
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      borderBottom: "1px solid rgba(48,54,61,0.5)",
                      borderLeft: row.is_pr
                        ? "2px solid var(--gold)"
                        : "2px solid transparent",
                      paddingLeft: 6,
                    }}
                  >
                    {fmtDate(row.date)}
                  </td>
                  <td
                    className="font-data tabular-nums py-[8px] pr-[16px]"
                    style={{
                      fontSize: 11,
                      color: "var(--text)",
                      borderBottom: "1px solid rgba(48,54,61,0.5)",
                    }}
                  >
                    {row.load_kg != null ? `${row.load_kg.toFixed(1)} kg` : "—"}
                  </td>
                  <td
                    className="font-data tabular-nums py-[8px] pr-[16px]"
                    style={{
                      fontSize: 11,
                      color: "var(--text)",
                      borderBottom: "1px solid rgba(48,54,61,0.5)",
                    }}
                  >
                    {row.reps != null ? `×${row.reps}` : "—"}
                  </td>
                  <td
                    className="font-data tabular-nums py-[8px] pr-[16px]"
                    style={{
                      fontSize: 11,
                      color: row.is_pr ? "var(--gold)" : "var(--text)",
                      fontWeight: row.is_pr ? 600 : undefined,
                      borderBottom: "1px solid rgba(48,54,61,0.5)",
                    }}
                  >
                    {row.estimated_1rm_kg.toFixed(1)} kg
                    {row.is_pr && (
                      <span
                        className="ml-[4px]"
                        style={{ fontSize: 9, color: "var(--gold)" }}
                      >
                        PR
                      </span>
                    )}
                  </td>
                  <td
                    className="font-data py-[8px]"
                    style={{
                      fontSize: 10.5,
                      color: "var(--muted)",
                      borderBottom: "1px solid rgba(48,54,61,0.5)",
                    }}
                  >
                    {row.notes ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="px-[18px] pt-[14px] pb-[40px] md:px-6 md:py-8 max-w-6xl mx-auto">
      {/* Mobile: single column */}
      <div className="md:hidden">
        {headerBlock}
        {chartBlock}
        {tableBlock}
      </div>

      {/* Desktop: two-column (40% left, 60% right) */}
      <div
        className="hidden md:grid md:gap-[40px]"
        style={{ gridTemplateColumns: "40% 1fr" }}
      >
        {/* Left: header + calculator placeholder (replaced in Step 4) */}
        <div>
          {headerBlock}
          <div
            className="rounded-[12px] p-[16px] font-data"
            style={{
              background: "var(--surface)",
              border: "1px dashed var(--border)",
              color: "var(--muted)",
              fontSize: 11,
            }}
            data-testid="calculator-placeholder"
          >
            $ load calculator
            <span
              className="block mt-[4px]"
              style={{ fontSize: 10, color: "var(--muted)" }}
            >
              (Step 4)
            </span>
          </div>
        </div>

        {/* Right: chart + table */}
        <div>
          {chartBlock}
          {tableBlock}
        </div>
      </div>
    </div>
  );
}
