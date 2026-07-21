"use client";

import { useId, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ChartDataTable } from "@/components/shared/chart-data-table";
import { formatDayShort } from "@/lib/analytics/load-chart-helpers";
import type { DailyLoadPoint } from "@/lib/api";

const CHART_HEIGHT = 180;
const TSB_PANEL_HEIGHT = 72;
const PAD_TOP = 10;
const PAD_BOTTOM = 18;

// One hue per series, maximally separated (the load-model chart is the
// domain's sanctioned multi-color exception, design-spec 04 cross-cutting
// conventions — `--purple` stays reserved for PRs and is never spent here).
// CTL is not independently toggleable — it's the resting-state default series
// (Bible 1.5) and toggling it off would leave the chart empty, so only ATL
// and TSB get colored-dot toggle chips; CTL's chip is a static legend key.
const CTL_COLOR = "var(--accent)";
const ATL_COLOR = "var(--chart-1)";
const TSB_COLOR = "var(--muted-strong)";

interface Props {
  series: DailyLoadPoint[];
  showAtl: boolean;
  onToggleAtl: () => void;
  showTsb: boolean;
  onToggleTsb: () => void;
  /** ISO date: days before this are hatched as "building baseline" (null = no hatch needed). */
  warmupCutoff: string | null;
  windowDays: number;
}

function xFor(
  index: number,
  count: number,
  width: number,
  pad: number,
): number {
  if (count <= 1) return pad + (width - pad * 2) / 2;
  return pad + (index / (count - 1)) * (width - pad * 2);
}

/** Day-slot pitch matching `xFor`'s spacing — NOT `width / count`, which
 * disagrees with `xFor` for count > 1 and leaves dead zones between tap
 * targets (each point sits `(width - 2*pad) / (count - 1)` apart, not
 * `width / count` apart). */
function slotPitch(count: number, width: number, pad: number): number {
  if (count <= 1) return width;
  return (width - pad * 2) / (count - 1);
}

/** Invisible per-day tap targets for tap-to-focus, shared by the main
 * CTL/ATL panel and the TSB panel so their hit-test math can't drift apart. */
function TapTargets({
  series,
  width,
  height,
  pad,
  onSelect,
  withTitle,
}: {
  series: DailyLoadPoint[];
  width: number;
  height: number;
  pad: number;
  onSelect: (index: number) => void;
  withTitle?: boolean;
}) {
  const pitch = slotPitch(series.length, width, pad);
  return (
    <>
      {series.map((p, i) => {
        const x = xFor(i, series.length, width, pad);
        return (
          <rect
            key={p.day}
            x={Math.max(0, x - pitch / 2)}
            y={0}
            width={pitch}
            height={height}
            fill="transparent"
            onClick={() => onSelect(i)}
            style={{ cursor: "pointer" }}
          >
            {withTitle && <title>{formatDayShort(p.day)}</title>}
          </rect>
        );
      })}
    </>
  );
}

export function LoadChart({
  series,
  showAtl,
  onToggleAtl,
  showTsb,
  onToggleTsb,
  warmupCutoff,
  windowDays,
}: Props) {
  const prefersReducedMotion = useReducedMotion();
  const hatchId = useId();
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const WIDTH = 600;
  const PAD_X = 4;

  const maxMain = Math.max(
    1,
    ...series.map((p) => Math.max(p.ctl, showAtl ? p.atl : 0)),
  );
  const yMain = (v: number) =>
    CHART_HEIGHT -
    PAD_BOTTOM -
    (Math.max(0, v) / (maxMain * 1.15)) * (CHART_HEIGHT - PAD_TOP - PAD_BOTTOM);

  const ctlPoints = series.map((p, i) => ({
    x: xFor(i, series.length, WIDTH, PAD_X),
    y: yMain(p.ctl),
  }));
  const atlPoints = series.map((p, i) => ({
    x: xFor(i, series.length, WIDTH, PAD_X),
    y: yMain(p.atl),
  }));

  const ctlPath = ctlPoints
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const ctlAreaPath =
    ctlPath +
    ` L${ctlPoints[ctlPoints.length - 1]?.x.toFixed(1)},${
      CHART_HEIGHT - PAD_BOTTOM
    } L${ctlPoints[0]?.x.toFixed(1)},${CHART_HEIGHT - PAD_BOTTOM} Z`;
  const atlPath = atlPoints
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  // `findIndex` returns -1 both when there's no cutoff to apply AND when the
  // cutoff falls entirely AFTER the visible window (i.e. the user's whole
  // training history is still within the 42-day warm-up — the case where the
  // ENTIRE chart should hatch, not none of it). Distinguish those explicitly
  // rather than treating -1 as "no hatch" across the board.
  const rawWarmupIndex = warmupCutoff
    ? series.findIndex((p) => p.day >= warmupCutoff)
    : -1;
  const cutoffBeyondWindow =
    warmupCutoff !== null &&
    series.length > 0 &&
    warmupCutoff > series[series.length - 1]!.day;
  const warmupEndIndex = cutoffBeyondWindow ? series.length : rawWarmupIndex;
  const warmupX =
    warmupEndIndex > 0
      ? warmupEndIndex >= series.length
        ? WIDTH - PAD_X
        : xFor(warmupEndIndex, series.length, WIDTH, PAD_X)
      : 0;

  const focused = focusedIndex !== null ? series[focusedIndex] : null;

  // TSB panel — its own small chart with a zero-crossing baseline, never a
  // second right-hand axis on the CTL/ATL plot (the exact anti-pattern the
  // design doc's "multi-axis problem" section warns against).
  const maxAbsTsb = Math.max(1, ...series.map((p) => Math.abs(p.tsb)));
  const tsbZeroY = TSB_PANEL_HEIGHT / 2;
  const yTsb = (v: number) =>
    tsbZeroY - (v / (maxAbsTsb * 1.2)) * (tsbZeroY - 4);
  const tsbPoints = series.map((p, i) => ({
    x: xFor(i, series.length, WIDTH, PAD_X),
    y: yTsb(p.tsb),
  }));
  const tsbPath = tsbPoints
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  function handlePointerDay(index: number) {
    setFocusedIndex((cur) => (cur === index ? null : index));
  }

  const firstDay = series[0]?.day;
  const lastDay = series[series.length - 1]?.day;

  return (
    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono text-[11px] text-[var(--muted-foreground)]">
          Last {windowDays} days
        </p>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-sans text-[11px] text-[var(--muted-foreground)]">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: CTL_COLOR }}
              aria-hidden="true"
            />
            Fitness (CTL)
          </span>
          <button
            type="button"
            onClick={onToggleAtl}
            aria-pressed={showAtl}
            aria-label="Toggle Fatigue (ATL) line"
            className="flex items-center gap-1 font-sans text-[11px] transition-opacity"
            style={{
              color: showAtl ? "var(--foreground)" : "var(--muted-foreground)",
              opacity: showAtl ? 1 : 0.55,
            }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: ATL_COLOR }}
              aria-hidden="true"
            />
            Fatigue (ATL)
          </button>
          <button
            type="button"
            onClick={onToggleTsb}
            aria-pressed={showTsb}
            aria-label="Toggle Form (TSB) panel"
            className="flex items-center gap-1 font-sans text-[11px] transition-opacity"
            style={{
              color: showTsb ? "var(--foreground)" : "var(--muted-foreground)",
              opacity: showTsb ? 1 : 0.55,
            }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: TSB_COLOR }}
              aria-hidden="true"
            />
            Form (TSB)
          </button>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${CHART_HEIGHT}`}
        width="100%"
        height={CHART_HEIGHT}
        role="group"
        aria-label={`Fitness (CTL) trend${
          showAtl ? " with Fatigue (ATL)" : ""
        } over the last ${windowDays} days`}
        className="block"
      >
        <defs>
          <linearGradient id={`${hatchId}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CTL_COLOR} stopOpacity={0.22} />
            <stop offset="100%" stopColor={CTL_COLOR} stopOpacity={0} />
          </linearGradient>
          <pattern
            id={`${hatchId}-hatch`}
            width={6}
            height={6}
            patternTransform="rotate(45)"
            patternUnits="userSpaceOnUse"
          >
            <rect width={6} height={6} fill="transparent" />
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={6}
              stroke="var(--muted-foreground)"
              strokeWidth={1.5}
              strokeOpacity={0.35}
            />
          </pattern>
        </defs>

        {warmupEndIndex > 0 && (
          <>
            <rect
              x={0}
              y={PAD_TOP}
              width={warmupX}
              height={CHART_HEIGHT - PAD_TOP - PAD_BOTTOM}
              fill={`url(#${hatchId}-hatch)`}
            />
            <text
              x={4}
              y={PAD_TOP + 12}
              className="font-sans"
              fontSize={9}
              fill="var(--muted-foreground)"
            >
              building baseline
            </text>
          </>
        )}

        <path d={ctlAreaPath} fill={`url(#${hatchId}-fill)`} />
        <path
          d={ctlPath}
          fill="none"
          stroke={CTL_COLOR}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {showAtl && (
          <path
            d={atlPath}
            fill="none"
            stroke={ATL_COLOR}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        )}

        {focused && ctlPoints[focusedIndex ?? -1] && (
          <line
            x1={ctlPoints[focusedIndex as number]!.x}
            x2={ctlPoints[focusedIndex as number]!.x}
            y1={PAD_TOP}
            y2={CHART_HEIGHT - PAD_BOTTOM}
            stroke="var(--muted-foreground)"
            strokeWidth={1}
            strokeDasharray="2 2"
          />
        )}

        {/* Invisible tap targets, one per day, for tap-to-focus (not scrub). */}
        <TapTargets
          series={series}
          width={WIDTH}
          height={CHART_HEIGHT}
          pad={PAD_X}
          onSelect={handlePointerDay}
          withTitle
        />

        <text
          x={4}
          y={CHART_HEIGHT - 4}
          fontSize={9}
          className="font-mono"
          fill="var(--muted-foreground)"
        >
          {firstDay ? formatDayShort(firstDay) : ""}
        </text>
        <text
          x={WIDTH - 4}
          y={CHART_HEIGHT - 4}
          fontSize={9}
          textAnchor="end"
          className="font-mono"
          fill="var(--muted-foreground)"
        >
          {lastDay ? formatDayShort(lastDay) : ""}
        </text>
      </svg>

      {focused && (
        <div
          className="mt-2 rounded-[6px] bg-[var(--secondary)] px-3 py-2 flex items-center gap-4"
          role="status"
        >
          <span className="font-sans text-[11px] text-[var(--muted-foreground)]">
            {formatDayShort(focused.day)}
          </span>
          <span className="font-mono text-[12px] text-[var(--foreground)] tabular-nums">
            CTL {focused.ctl.toFixed(1)}
          </span>
          {showAtl && (
            <span className="font-mono text-[12px] text-[var(--foreground)] tabular-nums">
              ATL {focused.atl.toFixed(1)}
            </span>
          )}
        </div>
      )}

      {showTsb && (
        <div className="mt-3 border-t border-[var(--border)] pt-2">
          <p className="font-sans text-[11px] text-[var(--muted-foreground)] mb-1">
            Form (TSB)
          </p>
          <svg
            viewBox={`0 0 ${WIDTH} ${TSB_PANEL_HEIGHT}`}
            width="100%"
            height={TSB_PANEL_HEIGHT}
            role="group"
            aria-label={`Form (TSB) over the last ${windowDays} days, zero-crossing baseline`}
            className="block"
          >
            <line
              x1={0}
              x2={WIDTH}
              y1={tsbZeroY}
              y2={tsbZeroY}
              stroke="var(--muted-foreground)"
              strokeWidth={1}
              strokeOpacity={0.6}
            />
            <text
              x={4}
              y={tsbZeroY - 3}
              fontSize={9}
              className="font-mono"
              fill="var(--muted-foreground)"
            >
              0
            </text>
            <path
              d={tsbPath}
              fill="none"
              stroke={TSB_COLOR}
              strokeWidth={1.5}
              strokeLinejoin="round"
              style={{
                transition: prefersReducedMotion
                  ? undefined
                  : "d 200ms var(--ease-standard, ease)",
              }}
            />
            <TapTargets
              series={series}
              width={WIDTH}
              height={TSB_PANEL_HEIGHT}
              pad={PAD_X}
              onSelect={handlePointerDay}
            />
          </svg>
          {focused && (
            <div
              className="mt-2 rounded-[6px] bg-[var(--secondary)] px-3 py-2 flex items-center gap-4"
              role="status"
            >
              <span className="font-sans text-[11px] text-[var(--muted-foreground)]">
                {formatDayShort(focused.day)}
              </span>
              <span className="font-mono text-[12px] text-[var(--foreground)] tabular-nums">
                TSB {focused.tsb > 0 ? "+" : ""}
                {focused.tsb.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      )}

      <ChartDataTable
        caption={`Daily fitness (CTL), fatigue (ATL), form (TSB), ACWR, and training load over the last ${windowDays} days`}
        columns={["Date", "CTL", "ATL", "TSB", "ACWR", "Load (AU)"]}
        rows={series.map((p) => [
          p.day,
          p.ctl.toFixed(1),
          p.atl.toFixed(1),
          p.tsb.toFixed(1),
          p.acwr !== null ? p.acwr.toFixed(2) : "—",
          p.load_au.toFixed(0),
        ])}
      />
    </div>
  );
}
