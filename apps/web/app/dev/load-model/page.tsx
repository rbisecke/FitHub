import { ForcedTheme } from "@/components/shared/forced-theme";
import { LoadModelScreen } from "@/components/load-model/LoadModelScreen";
import type { DailyLoadPoint, LoadModelResponse } from "@/lib/api";

/** Mirrors the backend's `_acwr_zone()` (apps/api/app/routers/analytics.py) so
 * these mocks can't drift into a zone label that disagrees with the acwr
 * value actually plotted on the gauge. */
function zoneFor(acwr: number | null): LoadModelResponse["acwr_zone"] {
  if (acwr === null) return "insufficient_data";
  if (acwr < 0.8) return "undertraining";
  if (acwr <= 1.3) return "sweet_spot";
  if (acwr <= 1.5) return "caution";
  return "overreaching";
}

function isoDay(daysAgo: number): string {
  // Local date parts, never `toISOString()` (that's UTC and can mislabel
  // "today" by a day near local midnight — apps/web/CLAUDE.md date rule).
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Synthetic daily series: `totalDays` back from today, ramping CTL/ATL up. */
function buildSeries(totalDays: number): DailyLoadPoint[] {
  const points: DailyLoadPoint[] = [];
  let ctl = 0;
  let atl = 0;
  for (let i = totalDays - 1; i >= 0; i--) {
    const load = 30 + 25 * Math.sin(i / 4) + (totalDays - i) * 0.15;
    const loadAu = Math.max(0, load);
    ctl = ctl + (loadAu - ctl) * (1 - Math.exp(-1 / 42));
    atl = atl + (loadAu - atl) * (1 - Math.exp(-1 / 7));
    const tsb = ctl - atl;
    const daysElapsed = totalDays - i;
    const acwr =
      daysElapsed >= 28 ? +(atl / Math.max(ctl, 1)).toFixed(2) : null;
    points.push({
      day: isoDay(i),
      load_au: +loadAu.toFixed(1),
      ctl: +ctl.toFixed(2),
      atl: +atl.toFixed(2),
      tsb: +tsb.toFixed(2),
      acwr,
    });
  }
  return points;
}

const COLD_START: LoadModelResponse = {
  series: [],
  acwr_now: null,
  ctl_now: 0,
  atl_now: 0,
  tsb_now: 0,
  acwr_zone: "insufficient_data",
};

const INSUFFICIENT_ACWR_SERIES = buildSeries(15);
const INSUFFICIENT_ACWR: LoadModelResponse = {
  series: INSUFFICIENT_ACWR_SERIES,
  acwr_now: null,
  ctl_now: INSUFFICIENT_ACWR_SERIES.at(-1)?.ctl ?? 0,
  atl_now: INSUFFICIENT_ACWR_SERIES.at(-1)?.atl ?? 0,
  tsb_now: INSUFFICIENT_ACWR_SERIES.at(-1)?.tsb ?? 0,
  acwr_zone: "insufficient_data",
};

// A user 60 days into training: their first-ever workout was 60 days ago, so
// the warm-up cutoff (first workout + 42 days) falls inside this window —
// the chart should hatch roughly the first two-thirds of the plotted range.
const WARMUP_SERIES = buildSeries(60);
const WARMUP_CUTOFF = isoDay(60 - 42);
const WARMUP_ACWR_NOW = WARMUP_SERIES.at(-1)?.acwr ?? null;
const WARMUP_DATA: LoadModelResponse = {
  series: WARMUP_SERIES,
  acwr_now: WARMUP_ACWR_NOW,
  ctl_now: WARMUP_SERIES.at(-1)?.ctl ?? 0,
  atl_now: WARMUP_SERIES.at(-1)?.atl ?? 0,
  tsb_now: WARMUP_SERIES.at(-1)?.tsb ?? 0,
  acwr_zone: zoneFor(WARMUP_ACWR_NOW),
};

const HEALTHY_SERIES = buildSeries(90);
const HEALTHY_ACWR_NOW = HEALTHY_SERIES.at(-1)?.acwr ?? null;
const HEALTHY: LoadModelResponse = {
  series: HEALTHY_SERIES,
  acwr_now: HEALTHY_ACWR_NOW,
  ctl_now: HEALTHY_SERIES.at(-1)?.ctl ?? 0,
  atl_now: HEALTHY_SERIES.at(-1)?.atl ?? 0,
  tsb_now: HEALTHY_SERIES.at(-1)?.tsb ?? 0,
  acwr_zone: zoneFor(HEALTHY_ACWR_NOW),
};

const OVERREACHING_SERIES = buildSeries(90).map((p, i, arr) =>
  i > arr.length - 10 ? { ...p, atl: p.ctl * 1.8, acwr: 1.8 } : p,
);
const OVERREACHING_ACWR_NOW = 1.8;
const OVERREACHING: LoadModelResponse = {
  series: OVERREACHING_SERIES,
  acwr_now: OVERREACHING_ACWR_NOW,
  ctl_now: OVERREACHING_SERIES.at(-1)?.ctl ?? 0,
  atl_now: OVERREACHING_SERIES.at(-1)?.atl ?? 0,
  tsb_now:
    (OVERREACHING_SERIES.at(-1)?.ctl ?? 0) -
    (OVERREACHING_SERIES.at(-1)?.atl ?? 0),
  acwr_zone: zoneFor(OVERREACHING_ACWR_NOW),
};

/**
 * Dev-only preview (Effort 6, design-spec 04 Screen 4). Renders the
 * production LoadModelScreen with synthetic data covering states that are
 * awkward or impossible to reach with real auth+data on a short-lived local
 * stack: brand-new-user cold start, ACWR-insufficient-data (< 28 days of
 * history), the warm-up-ramp hatch region, a healthy sweet-spot zone, and an
 * overreaching zone. Mirrors the established `dev/injuries-list` mock-data
 * pattern. Not part of the shipping app.
 */
export default function DevLoadModelPreview() {
  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <div className="flex flex-col gap-10 py-6">
        <section>
          <p className="mb-2 px-4 font-mono text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">
            Cold start — brand-new user, no training load logged
          </p>
          <LoadModelScreen
            token="dev-preview-token"
            initialData={COLD_START}
            initialLoadFailed={false}
          />
        </section>

        <section>
          <p className="mb-2 px-4 font-mono text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">
            ACWR insufficient data — 15 days logged, under the 28-day threshold
          </p>
          <LoadModelScreen
            token="dev-preview-token"
            initialData={INSUFFICIENT_ACWR}
            initialLoadFailed={false}
          />
        </section>

        <section>
          <p className="mb-2 px-4 font-mono text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">
            Warm-up ramp — first workout 60 days ago, hatch region visible
          </p>
          <LoadModelScreen
            token="dev-preview-token"
            initialData={WARMUP_DATA}
            initialLoadFailed={false}
            initialWarmupCutoff={WARMUP_CUTOFF}
          />
        </section>

        <section>
          <p className="mb-2 px-4 font-mono text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">
            Healthy — sweet-spot ACWR zone, 90-day window
          </p>
          <LoadModelScreen
            token="dev-preview-token"
            initialData={HEALTHY}
            initialLoadFailed={false}
          />
        </section>

        <section>
          <p className="mb-2 px-4 font-mono text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">
            Overreaching — ACWR danger zone
          </p>
          <LoadModelScreen
            token="dev-preview-token"
            initialData={OVERREACHING}
            initialLoadFailed={false}
          />
        </section>

        <section>
          <p className="mb-2 px-4 font-mono text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">
            Error state
          </p>
          <LoadModelScreen
            token="dev-preview-token"
            initialData={null}
            initialLoadFailed={true}
          />
        </section>
      </div>
    </ForcedTheme>
  );
}
