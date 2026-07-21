import { describe, it, expect } from "vitest";
import {
  buildWeekWindow,
  aggregateWeeklyBars,
  aggregateStackedBars,
  distinctViews,
} from "@/lib/analytics/volume-trend";
import type { WeeklyVolume } from "@/lib/api";

function row(
  week_start: string,
  session_type: WeeklyVolume["session_type"],
  total_load: number,
  workout_count = 1,
): WeeklyVolume {
  return { week_start, session_type, total_load, workout_count };
}

describe("buildWeekWindow", () => {
  it("returns weeksCount Monday-aligned dates ending at the current week, oldest first", () => {
    // 2026-07-21 is a Tuesday; its Monday is 2026-07-20.
    const now = new Date(2026, 6, 21);
    const window = buildWeekWindow(3, now);
    expect(window).toEqual(["2026-07-06", "2026-07-13", "2026-07-20"]);
  });

  it("aligns to the same Monday when `now` already IS a Monday", () => {
    const now = new Date(2026, 6, 20); // a Monday
    const window = buildWeekWindow(1, now);
    expect(window).toEqual(["2026-07-20"]);
  });
});

describe("aggregateWeeklyBars", () => {
  const window = ["2026-07-06", "2026-07-13", "2026-07-20"];

  it("renders a week with zero workouts as a gap (null), not a zero bar", () => {
    const rows = [row("2026-07-06", "strength", 500)];
    const bars = aggregateWeeklyBars(rows, window, "all", "total_load");
    expect(bars).toEqual([
      { weekStart: "2026-07-06", value: 500 },
      { weekStart: "2026-07-13", value: null },
      { weekStart: "2026-07-20", value: null },
    ]);
  });

  it("renders a real recorded zero distinctly from a gap", () => {
    const rows = [row("2026-07-06", "strength", 0)];
    const bars = aggregateWeeklyBars(rows, window, "all", "total_load");
    expect(bars[0]).toEqual({ weekStart: "2026-07-06", value: 0 });
  });

  it("buckets session_type=null into 'other', never dropping it", () => {
    const rows = [row("2026-07-06", null, 200)];
    const bars = aggregateWeeklyBars(rows, window, "other", "total_load");
    expect(bars[0]?.value).toBe(200);
    const allBars = aggregateWeeklyBars(rows, window, "all", "total_load");
    expect(allBars[0]?.value).toBe(200);
  });

  it("sums multiple session types for the 'all' view", () => {
    const rows = [
      row("2026-07-06", "strength", 300),
      row("2026-07-06", "metcon", 150),
    ];
    const bars = aggregateWeeklyBars(rows, window, "all", "total_load");
    expect(bars[0]?.value).toBe(450);
  });

  it("filters to a single session type when view is specific", () => {
    const rows = [
      row("2026-07-06", "strength", 300),
      row("2026-07-06", "metcon", 150),
    ];
    const bars = aggregateWeeklyBars(rows, window, "strength", "total_load");
    expect(bars[0]?.value).toBe(300);
  });

  it("supports the workout_count metric", () => {
    const rows = [row("2026-07-06", "strength", 300, 4)];
    const bars = aggregateWeeklyBars(rows, window, "all", "workout_count");
    expect(bars[0]?.value).toBe(4);
  });
});

describe("aggregateStackedBars", () => {
  it("keeps a gap null and a real week's per-type segments", () => {
    const window = ["2026-07-06", "2026-07-13"];
    const rows = [
      row("2026-07-06", "strength", 300),
      row("2026-07-06", "metcon", 150),
    ];
    const bars = aggregateStackedBars(rows, window, "total_load");
    expect(bars[0]).toEqual({
      weekStart: "2026-07-06",
      segments: { strength: 300, metcon: 150 },
    });
    expect(bars[1]).toEqual({ weekStart: "2026-07-13", segments: null });
  });

  it("keeps a real recorded zero (rows exist, all sum to 0) distinct from a gap", () => {
    const window = ["2026-07-06", "2026-07-13"];
    const rows = [row("2026-07-06", null, 0)];
    const bars = aggregateStackedBars(rows, window, "total_load");
    expect(bars[0]).toEqual({
      weekStart: "2026-07-06",
      segments: { other: 0 },
    });
    expect(bars[0]?.segments).not.toBeNull();
  });
});

describe("distinctViews", () => {
  it("includes 'other' for null session_type rows", () => {
    const rows = [
      row("2026-07-06", null, 100),
      row("2026-07-06", "strength", 200),
    ];
    expect(distinctViews(rows).sort()).toEqual(["other", "strength"]);
  });
});
