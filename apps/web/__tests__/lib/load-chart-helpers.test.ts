import { describe, it, expect } from "vitest";
import {
  computeTrendDirection,
  trendColorClass,
  trendGlyph,
  aggregateWeekly,
  computeWarmupCutoff,
  ACWR_ZONE_BANDS,
  ACWR_GAUGE_MAX,
} from "@/lib/analytics/load-chart-helpers";
import type { ContributionPoint, DailyLoadPoint } from "@/lib/api";

function point(
  day: string,
  overrides: Partial<DailyLoadPoint> = {},
): DailyLoadPoint {
  return {
    day,
    load_au: 0,
    ctl: 0,
    atl: 0,
    tsb: 0,
    acwr: null,
    ...overrides,
  };
}

function buildDailySeries(
  days: number,
  valueAt: (i: number) => number,
): DailyLoadPoint[] {
  return Array.from({ length: days }, (_, i) =>
    point(`2026-01-${String(i + 1).padStart(2, "0")}`, {
      ctl: valueAt(i),
      atl: valueAt(i),
      tsb: valueAt(i),
    }),
  );
}

describe("computeTrendDirection / trendColorClass / trendGlyph", () => {
  it("returns flat (never colored) when there isn't enough history", () => {
    const series = buildDailySeries(5, (i) => i);
    expect(computeTrendDirection(10, series, "ctl")).toBe("flat");
  });

  it("returns up when the value has risen meaningfully vs ~7 days ago", () => {
    const series = buildDailySeries(10, (i) => i * 2); // day0=0 ... day9=18
    // current value (day 9) is 18, value 7 days before the latest is day 2 = 4
    expect(computeTrendDirection(18, series, "ctl")).toBe("up");
  });

  it("returns down when the value has fallen", () => {
    const series = buildDailySeries(10, (i) => 20 - i * 2);
    expect(computeTrendDirection(2, series, "ctl")).toBe("down");
  });

  it("only colors the 'up' direction — down and flat are always neutral, never red", () => {
    expect(trendColorClass("up")).toBe("text-[var(--green)]");
    expect(trendColorClass("down")).toBe("text-[var(--muted)]");
    expect(trendColorClass("flat")).toBe("text-[var(--muted)]");
    // Explicitly assert red is never produced by this function for any input.
    for (const dir of ["up", "down", "flat"] as const) {
      expect(trendColorClass(dir)).not.toContain("red");
    }
  });

  it("maps directions to the expected glyphs", () => {
    expect(trendGlyph("up")).toBe("↑");
    expect(trendGlyph("down")).toBe("↓");
    expect(trendGlyph("flat")).toBe("→");
  });
});

describe("ACWR_ZONE_BANDS", () => {
  it("tiles the 0–2.0 gauge scale with no gaps or overlaps", () => {
    const sorted = [...ACWR_ZONE_BANDS].sort((a, b) => a.min - b.min);
    expect(sorted[0]!.min).toBe(0);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]!.min).toBe(sorted[i - 1]!.max);
    }
    expect(sorted.at(-1)!.max).toBeNull();
    const lastFiniteMax = sorted[sorted.length - 2]!.max;
    expect(lastFiniteMax).toBeLessThanOrEqual(ACWR_GAUGE_MAX);
  });
});

describe("aggregateWeekly", () => {
  it("chunks a daily series into weekly-summed bars, oldest week first", () => {
    // 14 days, load_au = 1 every day -> two weeks of 7 each
    const series = Array.from({ length: 14 }, (_, i) =>
      point(`2026-02-${String(i + 1).padStart(2, "0")}`, { load_au: 1 }),
    );
    const weeks = aggregateWeekly(series);
    expect(weeks).toHaveLength(2);
    expect(weeks[0]!.loadAu).toBe(7);
    expect(weeks[1]!.loadAu).toBe(7);
    expect(weeks[0]!.weekStart).toBe("2026-02-01");
    expect(weeks[1]!.weekStart).toBe("2026-02-08");
  });

  it("sums a trailing partial week without dropping or double-counting days", () => {
    const series = Array.from({ length: 10 }, (_, i) =>
      point(`2026-03-${String(i + 1).padStart(2, "0")}`, { load_au: 2 }),
    );
    const weeks = aggregateWeekly(series);
    expect(weeks).toHaveLength(2);
    expect(weeks[0]!.loadAu).toBe(14); // 7 days * 2
    expect(weeks[1]!.loadAu).toBe(6); // trailing 3 days * 2
  });

  it("returns an empty array for an empty series", () => {
    expect(aggregateWeekly([])).toEqual([]);
  });
});

describe("computeWarmupCutoff", () => {
  it("returns null when there is no contribution history", () => {
    expect(computeWarmupCutoff([])).toBeNull();
  });

  it("returns the first-workout date plus 42 days", () => {
    const days: ContributionPoint[] = [
      { day: "2026-05-01", count: 1, load_au: 10 },
      { day: "2026-05-15", count: 1, load_au: 10 },
      { day: "2026-04-20", count: 1, load_au: 10 }, // earliest, out of order on purpose
    ];
    // 2026-04-20 + 42 days = 2026-06-01
    expect(computeWarmupCutoff(days)).toBe("2026-06-01");
  });
});
