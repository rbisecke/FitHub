import type { AdminDailyCostPoint } from "@/lib/api";
import { formatUsd } from "@/lib/admin/cost-format";

interface Props {
  data: AdminDailyCostPoint[];
  dailyAvg: number;
}

const LEFT = 40;
const TOP = 10;
const RIGHT = 10;
const BOTTOM = 20;
const VIEW_W = 660;
const VIEW_H = 200;
const CHART_W = VIEW_W - LEFT - RIGHT;
const CHART_H = VIEW_H - TOP - BOTTOM;

/** Heckbert's "nice number" rounding — snaps to a 1/2/5×10^n step so axis
 * labels are always round (e.g. $0.10/$0.20 steps, never $0.18/$0.35). Fixes
 * a critique finding: naively quartering an arbitrary max produced axis
 * labels like $0.18/$0.35/$0.53 that read as broken next to the otherwise
 * precise monospace figures. */
function niceNumber(range: number, round: boolean): number {
  if (range <= 0) return 1;
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / Math.pow(10, exponent);
  let niceFraction: number;
  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }
  return niceFraction * Math.pow(10, exponent);
}

/** Evenly-stepped gridlines from 0, guaranteed to reach at least `maxRaw`. */
function niceGridValues(maxRaw: number): number[] {
  if (maxRaw <= 0) return [0, 0.25, 0.5, 0.75, 1];
  const range = niceNumber(maxRaw, false); // nice ceiling >= maxRaw
  const step = niceNumber(range / 4, true);
  const count = Math.ceil(maxRaw / step);
  return Array.from({ length: count + 1 }, (_, i) => i * step);
}

/**
 * Daily cost trend — one line, one series (`08` §7, item 4; Bible §1.5). No
 * second axis, no overlay — a single accent-colored line with sparse dashed
 * gridlines, the same "simplest single-series view" the infra sparklines
 * use (`InfraPanel.tsx`). Replaced the earlier bar-chart rendering, which
 * didn't match the spec's explicit "line chart" call.
 */
export function CostChart({ data, dailyAvg }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center font-mono text-sm text-[var(--muted)]">
        No cost data yet.
      </div>
    );
  }

  const maxRaw = Math.max(...data.map((d) => d.cost_usd));
  const gridValues = niceGridValues(maxRaw);
  const maxVal = Math.max(...gridValues, 0.01);
  const n = data.length;

  const points = data.map((d, i) => {
    const x = LEFT + (n === 1 ? CHART_W / 2 : (i / (n - 1)) * CHART_W);
    const y =
      TOP + CHART_H - (maxVal > 0 ? (d.cost_usd / maxVal) * CHART_H : 0);
    return { x, y, d };
  });
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const xLabelIndices = new Set<number>([
    0,
    Math.floor(n / 3),
    Math.floor((2 * n) / 3),
    n - 1,
  ]);

  return (
    <div>
      <div className="mb-3.5 flex items-start justify-between">
        <div>
          <h2 className="type-h3 text-[var(--text)]">Daily cost</h2>
          <p className="type-caption mt-0.5 text-[var(--muted)]">
            Last 30 days · USD
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-lg font-bold tabular-nums text-[var(--text)]">
            {formatUsd(dailyAvg)}
          </div>
          <div className="font-mono text-[10.5px] text-[var(--muted)]">
            daily avg
          </div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        className="block h-auto"
        role="img"
        aria-label={`Daily cost trend over the last ${n} days, ranging up to ${formatUsd(
          maxRaw,
        )}`}
      >
        {gridValues.map((labelVal, i) => {
          const y =
            TOP + CHART_H - (maxVal > 0 ? (labelVal / maxVal) * CHART_H : 0);
          return (
            <g key={i}>
              <line
                x1={LEFT}
                y1={y}
                x2={VIEW_W - RIGHT}
                y2={y}
                stroke="var(--border)"
                strokeWidth="1"
                strokeDasharray="3 4"
              />
              <text
                x={LEFT - 6}
                y={y + 3.5}
                fontSize="9"
                fontFamily="var(--font-mono), monospace"
                fill="var(--muted)"
                textAnchor="end"
              >
                {formatUsd(labelVal)}
              </text>
            </g>
          );
        })}

        <path
          d={linePath}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* No per-point tooltip — the spec is explicit this trend line is
            "glanceable with no tooltip dependency" (`08` §7). A nested
            SVG <title> also triggers a browser rawtext-parsing quirk that
            produces a spurious hydration mismatch, so this is both the
            spec-correct and the bug-free choice. */}
        {points.map(({ x, y, d }, i) => (
          <circle
            key={d.day}
            cx={x}
            cy={y}
            r={i === points.length - 1 ? 3.5 : 2}
            fill="var(--accent)"
          />
        ))}
      </svg>

      <div className="mt-1 flex justify-between pl-10 font-mono text-[10px] text-[var(--muted)]">
        {data
          .map((d, i) => ({ d, i }))
          .filter(({ i }) => xLabelIndices.has(i))
          .map(({ d, i }) => (
            <span key={i}>
              {i === data.length - 1 ? "today" : d.day.slice(5)}
            </span>
          ))}
      </div>
    </div>
  );
}
