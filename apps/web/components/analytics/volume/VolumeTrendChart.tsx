import { bandScale, linearScale } from "@/lib/charts";
import { ChartDataTable } from "@/components/shared/chart-data-table";
import {
  weekTickLabel,
  SESSION_TYPE_LABEL,
  type WeekBar,
  type StackedWeekBar,
  type VolumeView,
  type VolumeMetric,
} from "@/lib/analytics/volume-trend";

const HEIGHT = 220;
const PAD_LEFT = 36;
const PAD_BOTTOM = 24;
const PAD_TOP = 12;

// "all" intentionally reuses --accent with "skill" and "deload" — it never
// co-occurs with per-type colors (the stacked chart always filters "all" out
// of its view list), so that reuse is safe. The remaining 7 session-type +
// "other" slices are spread across the full non-reserved semantic set, but
// with only 7 tokens to draw from (green/amber/purple/cyan/accent/muted/
// muted-strong — red and the domain-reserved tokens are off-limits), "rest"
// and "other" still share --muted; a stacked week containing both would be
// visually ambiguous between those two slices specifically.
const VIEW_COLOR: Record<VolumeView, string> = {
  all: "var(--accent)",
  strength: "var(--green)",
  metcon: "var(--amber)",
  skill: "var(--purple)",
  mixed: "var(--cyan)",
  rest: "var(--muted)",
  deload: "var(--accent)",
  active_recovery: "var(--muted-strong)",
  other: "var(--muted)",
};

interface SingleProps {
  stacked: false;
  bars: WeekBar[];
  metric: VolumeMetric;
  view: VolumeView;
  width?: number;
}

interface StackedProps {
  stacked: true;
  stackedBars: StackedWeekBar[];
  metric: VolumeMetric;
  views: VolumeView[];
  width?: number;
}

type Props = SingleProps | StackedProps;

/**
 * Screen 7 — Volume Trend chart (04 §Screen 7). Single-series-at-rest bar
 * chart: one bar per week, gaps (no workouts that week) rendered as a
 * hatched placeholder distinct from a real recorded zero (a thin solid
 * baseline bar). The opt-in stacked view renders one segment per session
 * type inside each week's bar — never the resting state (Bible 1.5).
 */
export function VolumeTrendChart(props: Props) {
  const width = props.width ?? 640;
  const weekStarts = props.stacked
    ? props.stackedBars.map((b) => b.weekStart)
    : props.bars.map((b) => b.weekStart);

  const totals: number[] = props.stacked
    ? props.stackedBars.map((b) =>
        b.segments
          ? Object.values(b.segments).reduce((s, v) => s + (v ?? 0), 0)
          : 0,
      )
    : props.bars.map((b) => b.value ?? 0);

  const maxValue = Math.max(1, ...totals);
  const x = bandScale(weekStarts, [PAD_LEFT, width], 0.35);
  const y = linearScale([0, maxValue], [HEIGHT - PAD_BOTTOM, PAD_TOP]);
  const bandwidth = x.bandwidth();

  const yTicks = y.ticks(4);
  const metricUnit = props.metric === "total_load" ? "AU" : "workouts";

  const srRows: Array<Array<string | number>> = props.stacked
    ? props.stackedBars.map((b) => [
        weekTickLabel(b.weekStart),
        b.segments
          ? Object.entries(b.segments)
              .map(([k, v]) => `${SESSION_TYPE_LABEL[k as VolumeView]}: ${v}`)
              .join(", ")
          : "no workouts logged (gap)",
      ])
    : props.bars.map((b) => [
        weekTickLabel(b.weekStart),
        b.value == null
          ? "no workouts logged (gap)"
          : `${b.value} ${metricUnit}`,
      ]);

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${HEIGHT}`}
        aria-hidden="true"
        className="w-full"
        style={{ maxHeight: HEIGHT }}
      >
        {/* gridlines */}
        {yTicks.map((t) => (
          <line
            key={t}
            x1={PAD_LEFT}
            x2={width}
            y1={y(t)}
            y2={y(t)}
            stroke="var(--border)"
            strokeDasharray="2 3"
          />
        ))}
        {yTicks.map((t) => (
          <text
            key={`label-${t}`}
            x={PAD_LEFT - 6}
            y={y(t)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={9}
            fill="var(--muted)"
          >
            {Math.round(t)}
          </text>
        ))}

        {!props.stacked &&
          props.bars.map((bar) => {
            const bx = x.scale(bar.weekStart);
            if (bar.value == null) {
              // Gap: a hatched placeholder at the baseline, distinct from a
              // real zero (04 §Screen 7 States, cross-screen edge case #6).
              return (
                <rect
                  key={bar.weekStart}
                  x={bx}
                  y={HEIGHT - PAD_BOTTOM - 3}
                  width={bandwidth}
                  height={3}
                  fill="none"
                  stroke="var(--border)"
                  strokeDasharray="2 2"
                />
              );
            }
            const barHeight = Math.max(
              bar.value === 0 ? 2 : 0,
              HEIGHT - PAD_BOTTOM - y(bar.value),
            );
            return (
              <rect
                key={bar.weekStart}
                x={bx}
                y={HEIGHT - PAD_BOTTOM - barHeight}
                width={bandwidth}
                height={barHeight}
                fill={VIEW_COLOR[props.view]}
                rx={2}
              />
            );
          })}

        {props.stacked &&
          props.stackedBars.map((bar) => {
            const bx = x.scale(bar.weekStart);
            if (!bar.segments) {
              // True gap: no rows at all this week (04 §Screen 7 States,
              // cross-screen edge case #6).
              return (
                <rect
                  key={bar.weekStart}
                  x={bx}
                  y={HEIGHT - PAD_BOTTOM - 3}
                  width={bandwidth}
                  height={3}
                  fill="none"
                  stroke="var(--border)"
                  strokeDasharray="2 2"
                />
              );
            }
            const segmentTotal = Object.values(bar.segments).reduce(
              (s, v) => s + (v ?? 0),
              0,
            );
            if (segmentTotal === 0) {
              // Rows existed this week but every type summed to zero (e.g. a
              // real "no load recorded" week) — a real recorded zero, drawn
              // distinctly from the dashed gap placeholder above, matching
              // the non-stacked path's treatment.
              return (
                <rect
                  key={bar.weekStart}
                  x={bx}
                  y={HEIGHT - PAD_BOTTOM - 2}
                  width={bandwidth}
                  height={2}
                  fill={VIEW_COLOR.other}
                  rx={1}
                />
              );
            }
            let cursorY = HEIGHT - PAD_BOTTOM;
            return (
              <g key={bar.weekStart}>
                {props.views.map((v) => {
                  const val = bar.segments?.[v] ?? 0;
                  if (val <= 0) return null;
                  const h = Math.max(0, HEIGHT - PAD_BOTTOM - y(val));
                  cursorY -= h;
                  return (
                    <rect
                      key={v}
                      x={bx}
                      y={cursorY}
                      width={bandwidth}
                      height={h}
                      fill={VIEW_COLOR[v]}
                    />
                  );
                })}
              </g>
            );
          })}

        {/* x-axis tick labels, every other week if dense */}
        {weekStarts.map((ws, i) => {
          const showEvery = weekStarts.length > 16 ? 2 : 1;
          if (i % showEvery !== 0) return null;
          const bx = x.scale(ws) + bandwidth / 2;
          return (
            <text
              key={ws}
              x={bx}
              y={HEIGHT - 6}
              textAnchor="middle"
              fontSize={9}
              fill="var(--muted)"
            >
              {weekTickLabel(ws)}
            </text>
          );
        })}
      </svg>

      <ChartDataTable
        caption="Weekly volume by week"
        columns={["Week starting", "Value"]}
        rows={srRows}
      />
    </div>
  );
}
