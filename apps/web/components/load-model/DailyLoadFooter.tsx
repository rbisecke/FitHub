import { ChartDataTable } from "@/components/shared/chart-data-table";
import {
  WEEKLY_ROLLUP_THRESHOLD_DAYS,
  aggregateWeekly,
  formatDayShort,
} from "@/lib/analytics/load-chart-helpers";
import type { DailyLoadPoint } from "@/lib/api";

const HEIGHT = 40;

/**
 * Daily load footer (design-spec 04 Screen 4): a thin per-day `load_au` bar
 * strip beneath the CTL/ATL/TSB chart, not a fourth competing line. `load_au`
 * is zero-filled every day in range by the API (edge-case-summary #6 — this
 * screen's series never has gaps), so no gap-handling logic is needed here.
 *
 * Aggregation switches from daily to weekly bars once the window exceeds
 * ~120 days: at that width, one bar per calendar day renders at sub-pixel
 * width and becomes unreadable, so days roll up into weekly-summed bars
 * instead. The 90-day default window always stays daily.
 */
export function DailyLoadFooter({ series }: { series: DailyLoadPoint[] }) {
  const useWeekly = series.length > WEEKLY_ROLLUP_THRESHOLD_DAYS;
  const bars = useWeekly
    ? aggregateWeekly(series).map((w) => ({
        key: w.weekStart,
        value: w.loadAu,
        label: w.weekStart,
      }))
    : series.map((p) => ({ key: p.day, value: p.load_au, label: p.day }));

  const max = Math.max(1, ...bars.map((b) => b.value));

  return (
    <div>
      <p className="font-sans text-[10px] text-[var(--muted-foreground)] mb-1">
        Daily training load{useWeekly ? " (weekly total)" : ""}
      </p>
      <div
        className="flex items-end gap-px"
        style={{ height: HEIGHT }}
        role="img"
        aria-label={`${
          useWeekly ? "Weekly" : "Daily"
        } training load bar strip, ${bars.length} bars`}
      >
        {bars.map((b) => (
          <div
            key={b.key}
            className="flex-1 rounded-t-[1px] bg-[var(--accent)]/70"
            style={{
              height: `${Math.max(2, (b.value / max) * HEIGHT)}px`,
            }}
            title={`${formatDayShort(b.label)}: ${b.value.toFixed(0)} AU`}
          />
        ))}
      </div>
      <ChartDataTable
        caption={`${
          useWeekly ? "Weekly" : "Daily"
        } training load in arbitrary units`}
        columns={[useWeekly ? "Week starting" : "Date", "Load (AU)"]}
        rows={bars.map((b) => [formatDayShort(b.label), b.value.toFixed(0)])}
      />
    </div>
  );
}
