import {
  ACWR_GAUGE_MAX,
  ACWR_ZONE_BANDS,
  type AcwrZone,
} from "@/lib/analytics/load-chart-helpers";

const ZONE_COPY: Record<AcwrZone, string> = {
  insufficient_data: "Not enough data",
  undertraining: "Undertraining",
  sweet_spot: "Sweet spot",
  caution: "Caution",
  overreaching: "Overreaching",
};

/**
 * ACWR zone gauge (design-spec 04 Screen 4). A horizontal position-marker
 * gauge with FitHub's own four labeled zone bands, reusing TrainingPeaks'
 * readiness-gauge SHAPE, not its proprietary copy. Zone color is state only
 * (Bible 1.2) — every band always carries its text label so meaning is never
 * color-alone.
 */
export function AcwrGauge({
  acwrNow,
  acwrZone,
}: {
  acwrNow: number | null;
  acwrZone: AcwrZone;
}) {
  if (acwrZone === "insufficient_data" || acwrNow === null) {
    return (
      <div className="rounded-[10px] border border-[var(--border)] bg-[var(--card)] p-4">
        <p className="font-sans text-[13px] font-medium text-[var(--foreground)] mb-1">
          ACWR — not enough history yet
        </p>
        <p className="font-sans text-[12px] text-[var(--muted-foreground)]">
          Your acute:chronic workload ratio needs at least 28 days of logged
          training load to compute. Keep logging — this fills in on its own.
        </p>
        <div
          className="mt-3 h-2 rounded-full bg-[var(--muted)]/25"
          role="img"
          aria-label="ACWR gauge: not enough training history to compute a zone yet"
        />
      </div>
    );
  }

  const clamped = Math.min(acwrNow, ACWR_GAUGE_MAX);
  const markerPct = (clamped / ACWR_GAUGE_MAX) * 100;
  const activeBand = ACWR_ZONE_BANDS.find((b) => b.key === acwrZone);

  return (
    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-baseline justify-between mb-3">
        <p className="font-sans text-[13px] font-medium text-[var(--foreground)]">
          ACWR
        </p>
        <p className="font-mono text-[15px] font-bold text-[var(--foreground)] tabular-nums">
          {acwrNow.toFixed(2)}
          <span
            className="ml-2 font-sans text-[12px] font-medium"
            style={{ color: activeBand?.color }}
          >
            {ZONE_COPY[acwrZone]}
          </span>
        </p>
      </div>

      <div
        className="relative h-2.5 rounded-full overflow-hidden flex"
        role="img"
        aria-label={`ACWR gauge, current value ${acwrNow.toFixed(2)}, in the ${
          ZONE_COPY[acwrZone]
        } zone`}
      >
        {ACWR_ZONE_BANDS.map((band) => {
          const bandMax = band.max ?? ACWR_GAUGE_MAX;
          const widthPct = ((bandMax - band.min) / ACWR_GAUGE_MAX) * 100;
          return (
            <div
              key={band.key}
              style={{ width: `${widthPct}%`, background: band.color }}
              className="h-full first:rounded-l-full last:rounded-r-full opacity-80"
            />
          );
        })}
        <div
          className="absolute top-1/2 h-4 w-1 -translate-y-1/2 -translate-x-1/2 rounded-full bg-[var(--foreground)] shadow-[0_0_0_2px_var(--card)]"
          style={{ left: `${markerPct}%` }}
        />
      </div>

      <div className="mt-1.5 flex justify-between">
        {ACWR_ZONE_BANDS.map((band) => (
          <span
            key={band.key}
            className="font-sans text-[12px] text-[var(--muted-foreground)] leading-tight"
          >
            {band.label}
          </span>
        ))}
      </div>
    </div>
  );
}
