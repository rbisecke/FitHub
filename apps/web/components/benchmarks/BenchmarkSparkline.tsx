import { ChartDataTable } from "@/components/shared/chart-data-table";
import { parseLocalDate } from "@/lib/units";
import type { BenchmarkAttempt } from "@/lib/api";

const WIDTH = 260;
const HEIGHT = 40;
const PAD_X = 4;
const PAD_Y = 6;

function formatDate(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Custom-SVG inverted-axis sparkline for one benchmark's attempt history
 * (design-spec 04 Screen 3). Lower `result_seconds` = better = higher on the
 * chart, so the y-axis is flipped and explicitly labeled "faster ↑" — meaning
 * is never encoded by direction alone. Unbounded: benchmark attempts are
 * naturally sparse (a handful to a few dozen over a training lifetime), so
 * unlike the 200-point-capped movement-trend chart, every attempt ever
 * logged is plotted here.
 *
 * Only rendered when there are 2+ attempts — a single attempt has no trend
 * to draw (handled by the caller, `BenchmarkCard`).
 */
export function BenchmarkSparkline({
  attempts,
  name,
}: {
  attempts: BenchmarkAttempt[];
  name: string;
}) {
  if (attempts.length < 2) return null;

  const seconds = attempts.map((a) => a.result_seconds);
  const min = Math.min(...seconds);
  const max = Math.max(...seconds);
  const range = max - min || 1;

  const points = attempts.map((a, i) => {
    const x = PAD_X + (i / (attempts.length - 1)) * (WIDTH - PAD_X * 2);
    // Inverted: a slower (higher-second) attempt sits lower on the chart.
    const normalized = (a.result_seconds - min) / range;
    const y = PAD_Y + normalized * (HEIGHT - PAD_Y * 2);
    return { x, y };
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const prIndex = seconds.indexOf(min);
  const prPoint = points[prIndex];

  return (
    <div className="w-full">
      <div className="flex items-center justify-end mb-0.5">
        <span className="font-mono text-[10px] font-medium text-[var(--muted-strong)]">
          faster ↑
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        aria-hidden="true"
        className="block"
      >
        <path
          d={path}
          fill="none"
          stroke="var(--purple)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {prPoint && (
          <circle cx={prPoint.x} cy={prPoint.y} r={2.5} fill="var(--purple)" />
        )}
      </svg>
      <ChartDataTable
        caption={`${name} attempt history, oldest to newest`}
        columns={["Date", "Result"]}
        rows={attempts.map((a) => [formatDate(a.date), a.result_display])}
      />
    </div>
  );
}
