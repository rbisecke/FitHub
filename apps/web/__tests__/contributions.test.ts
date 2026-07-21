import { describe, it, expect } from "vitest";
import { gapFillContributions } from "@/lib/analytics/contributions";
import type { ContributionsResponse } from "@/lib/api";

describe("gapFillContributions", () => {
  it("fills every calendar day in the window, marking gaps unlogged", () => {
    const now = new Date(2026, 6, 21); // 2026-07-21
    const response: ContributionsResponse = {
      days: [{ day: "2026-07-20", count: 2, load_au: 150 }],
      total_workouts: 2,
    };
    const result = gapFillContributions(response, 3, now);
    expect(result).toEqual([
      { day: "2026-07-19", count: 0, load_au: 0, logged: false },
      { day: "2026-07-20", count: 2, load_au: 150, logged: true },
      { day: "2026-07-21", count: 0, load_au: 0, logged: false },
    ]);
  });

  it("returns an all-gap array for a user with zero logged days", () => {
    const now = new Date(2026, 6, 21);
    const response: ContributionsResponse = { days: [], total_workouts: 0 };
    const result = gapFillContributions(response, 2, now);
    expect(result.every((d) => !d.logged && d.count === 0)).toBe(true);
    expect(result.map((d) => d.day)).toEqual(["2026-07-20", "2026-07-21"]);
  });
});
