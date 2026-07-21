"use client";

import { useMemo, useState } from "react";
import { ChartDataTable } from "@/components/shared/chart-data-table";
import { parseLocalDate } from "@/lib/units";
import { formatWeight } from "@/lib/display";
import type { WeightUnit } from "@/lib/records/prFormat";
import type { E1RMPoint, PersonalRecord } from "@/lib/api";

const WIDTH = 600;
const HEIGHT = 220;
const PAD_X = 6;
const PAD_TOP = 14;
const PAD_BOTTOM = 20;
/** Above this point count, individual dots are suppressed (design-spec 04 2D). */
const DOT_DENSITY_THRESHOLD = 30;

function dayToTime(day: string): number {
  return parseLocalDate(day).getTime();
}

function fmtAxisDate(day: string): string {
  return parseLocalDate(day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function fmtFullDate(day: string): string {
  return parseLocalDate(day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Movement trend chart (design-spec 04 Screen 2D). One e1RM series,
 * oldest -> newest, date-proportional x-axis. Peak (a `--purple` dot at
 * `achieved_at` + a faint horizontal reference line) and projection (a
 * dashed forward segment ending in a hollow target marker) render as
 * overlays on this ONE line, never as separate series (Bible 1.5). Custom
 * SVG, not a charting library, with a `sr-only` data-table fallback built
 * from the same points driving the SVG.
 */
export function MovementTrendChart({
  points,
  record,
  unit,
  showProjection = true,
  staleProjection = false,
}: {
  points: E1RMPoint[];
  record: PersonalRecord;
  unit: WeightUnit;
  /** Variant A defers the projection overlay behind a tap (Bible 1.5 —
   * resting state is one hero + one supporting number); Variants B/C show
   * it immediately since the projection is core to their composition. */
  showProjection?: boolean;
  /** Stale state (Screen 2 States): the projection, if present, renders but
   * visually de-emphasized so a stale forecast isn't read as current. */
  staleProjection?: boolean;
}) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  // Captured once per mount, not read live inside the memo below — Date.now()
  // is an impure call and React's purity rule forbids calling it directly
  // during render/useMemo (same pattern as ActiveLoggingScreen's `openedAt`).
  const [now] = useState(() => Date.now());

  const sorted = useMemo(
    () => [...points].sort((a, b) => a.day.localeCompare(b.day)),
    [points],
  );

  const hasProjection =
    showProjection && record.next_pr_kg != null && record.next_pr_weeks != null;

  const geometry = useMemo(() => {
    if (sorted.length === 0) return null;

    const times = sorted.map((p) => dayToTime(p.day));
    const minTime = times[0]!;
    // Extend the domain to include today and the projection target, so the
    // dashed segment isn't compressed into a sliver and a stale movement
    // (a long gap between the last logged set and today) doesn't make the
    // projection anchor sit visually on top of old data.
    const projectionWeeks = hasProjection ? record.next_pr_weeks! : 0;
    const lastRealTime = times[times.length - 1]!;
    const projectedTime = now + projectionWeeks * 7 * 86_400_000;
    const maxTime = hasProjection
      ? Math.max(lastRealTime, now, projectedTime)
      : lastRealTime;
    const timeSpan = Math.max(maxTime - minTime, 1);

    const values = sorted.map((p) => p.estimated_1rm_kg);
    const maxValue = Math.max(
      record.best_1rm_kg,
      hasProjection ? record.next_pr_kg! : 0,
      ...values,
    );
    // Regression floor: y-axis never renders negative e1RM (functional §1.3).
    const yMax = maxValue * 1.15;

    const xFor = (time: number) =>
      PAD_X + ((time - minTime) / timeSpan) * (WIDTH - PAD_X * 2);
    const yFor = (value: number) =>
      HEIGHT -
      PAD_BOTTOM -
      (Math.max(0, value) / yMax) * (HEIGHT - PAD_TOP - PAD_BOTTOM);

    const linePoints = sorted.map((p, i) => ({
      x: xFor(times[i]!),
      y: yFor(p.estimated_1rm_kg),
      point: p,
    }));
    const linePath = linePoints
      .map(
        (p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`,
      )
      .join(" ");

    const peakIndex = sorted.findIndex((p) => p.day === record.achieved_at);
    const peakX =
      peakIndex >= 0
        ? linePoints[peakIndex]!.x
        : xFor(dayToTime(record.achieved_at));
    const peakY = yFor(record.best_1rm_kg);

    let projectionPath: string | null = null;
    let projectionTargetX: number | null = null;
    let projectionTargetY: number | null = null;
    if (hasProjection && record.current_e1rm_kg != null) {
      // Anchored at TODAY (not the last logged point's date) with today's
      // regression estimate — `current_e1rm_kg` is evaluated at today, so a
      // stale movement (a long gap since the last set) still projects
      // forward from now, rather than jumping from the old data point.
      const startX = xFor(now);
      const startY = yFor(record.current_e1rm_kg);
      projectionTargetX = xFor(projectedTime);
      projectionTargetY = yFor(record.next_pr_kg!);
      projectionPath = `M${startX.toFixed(1)},${startY.toFixed(
        1,
      )} L${projectionTargetX.toFixed(1)},${projectionTargetY.toFixed(1)}`;
    }

    return {
      linePoints,
      linePath,
      peakX,
      peakY,
      projectionPath,
      projectionTargetX,
      projectionTargetY,
      yFor,
    };
  }, [sorted, record, hasProjection, now]);

  if (!geometry || sorted.length === 0) {
    return (
      <p
        className="font-sans text-[12px]"
        style={{ color: "var(--muted-foreground)" }}
      >
        Not enough history to chart yet.
      </p>
    );
  }

  const showDots = sorted.length <= DOT_DENSITY_THRESHOLD;
  const focused = focusedIndex != null ? sorted[focusedIndex] : null;
  const firstDay = sorted[0]!.day;
  const lastDay = sorted[sorted.length - 1]!.day;

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        aria-hidden="true"
        className="block"
      >
        {/* Faint horizontal peak reference line */}
        <line
          x1={PAD_X}
          x2={WIDTH - PAD_X}
          y1={geometry.peakY}
          y2={geometry.peakY}
          stroke="var(--purple)"
          strokeOpacity={0.25}
          strokeDasharray="3 3"
        />

        {/* The one e1RM series */}
        <path
          d={geometry.linePath}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {showDots &&
          geometry.linePoints.map((p, i) => (
            <circle
              key={p.point.day}
              cx={p.x}
              cy={p.y}
              r={focusedIndex === i ? 4.5 : 3}
              fill="var(--accent)"
              onClick={() => setFocusedIndex((cur) => (cur === i ? null : i))}
              style={{ cursor: "pointer" }}
            />
          ))}

        {/* Invisible per-point tap targets when dots are suppressed (>30 pts) */}
        {!showDots &&
          geometry.linePoints.map((p, i) => (
            <rect
              key={p.point.day}
              x={p.x - 4}
              y={0}
              width={8}
              height={HEIGHT}
              fill="transparent"
              onClick={() => setFocusedIndex((cur) => (cur === i ? null : i))}
              style={{ cursor: "pointer" }}
            />
          ))}

        {/* Peak marker: filled purple = earned (cross-cutting purple convention) */}
        <circle
          cx={geometry.peakX}
          cy={geometry.peakY}
          r={5}
          fill="var(--purple)"
        />

        {/* Dashed forward projection segment, ending in a HOLLOW purple
            target marker — projected, not-yet-earned (cross-cutting rule) */}
        {geometry.projectionPath && (
          <g opacity={staleProjection ? 0.4 : 1}>
            <path
              d={geometry.projectionPath}
              fill="none"
              stroke="var(--purple)"
              strokeWidth={2}
              strokeDasharray="5 4"
              strokeLinecap="round"
            />
            <circle
              cx={geometry.projectionTargetX!}
              cy={geometry.projectionTargetY!}
              r={5}
              fill="none"
              stroke="var(--purple)"
              strokeWidth={2}
            />
          </g>
        )}

        {focused && (
          <line
            x1={geometry.linePoints.find((p) => p.point.day === focused.day)?.x}
            x2={geometry.linePoints.find((p) => p.point.day === focused.day)?.x}
            y1={PAD_TOP}
            y2={HEIGHT - PAD_BOTTOM}
            stroke="var(--muted-foreground)"
            strokeWidth={1}
            strokeDasharray="2 2"
          />
        )}

        <text
          x={PAD_X}
          y={HEIGHT - 4}
          fontSize={9}
          className="font-mono"
          fill="var(--muted-foreground)"
        >
          {fmtAxisDate(firstDay)}
        </text>
        <text
          x={WIDTH - PAD_X}
          y={HEIGHT - 4}
          fontSize={9}
          textAnchor="end"
          className="font-mono"
          fill="var(--muted-foreground)"
        >
          {fmtAxisDate(lastDay)}
        </text>
      </svg>

      {focused && (
        <div
          className="mt-2 flex items-center gap-3 rounded-[6px] bg-[var(--secondary)] px-3 py-2"
          role="status"
        >
          <span className="font-sans text-[11px] text-[var(--muted-foreground)]">
            {fmtFullDate(focused.day)}
          </span>
          <span className="font-mono text-[12px] tabular-nums text-[var(--foreground)]">
            {formatWeight(focused.estimated_1rm_kg, unit)}
          </span>
        </div>
      )}

      <ChartDataTable
        caption={`Estimated 1-rep-max history for ${record.movement_name}`}
        columns={["Date", "Estimated 1RM"]}
        rows={sorted.map((p: E1RMPoint) => [
          fmtFullDate(p.day),
          formatWeight(p.estimated_1rm_kg, unit),
        ])}
      />
    </div>
  );
}
