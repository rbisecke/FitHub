import { describe, it, expect } from "vitest";
import { aggregateByDay } from "@/lib/dashboard/contributionTitle";

describe("aggregateByDay (contribution-graph cell tooltips)", () => {
  it("sums count and weight per calendar day", () => {
    const day1a = new Date(2026, 2, 1, 9);
    const day1b = new Date(2026, 2, 1, 18);
    const day2 = new Date(2026, 2, 2, 9);

    const byDay = aggregateByDay([
      { date: day1a, weight: 100 },
      { date: day1b, weight: 50 },
      { date: day2, weight: 30 },
    ]);

    expect(byDay.get(day1a.toDateString())).toEqual({ count: 2, sum: 150 });
    expect(byDay.get(day2.toDateString())).toEqual({ count: 1, sum: 30 });
  });

  it("returns an empty map for no workouts", () => {
    expect(aggregateByDay([]).size).toBe(0);
  });
});
