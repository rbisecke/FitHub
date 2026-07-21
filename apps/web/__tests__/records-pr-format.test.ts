import { describe, it, expect } from "vitest";
import {
  deltaKind,
  e1rmConfidenceQualifier,
  formatTime,
  prHeroValue,
  prSourceExpression,
  trendDirection,
  variantLabel,
} from "@/lib/records/prFormat";
import type { PersonalRecord } from "@/lib/api";

function pr(overrides: Partial<PersonalRecord>): PersonalRecord {
  return {
    movement_id: "m-1",
    movement_name: "Bench Press",
    best_1rm_kg: 100,
    achieved_at: "2026-06-01",
    workout_id: "w-1",
    load_kg: 100,
    reps: 1,
    time_s: null,
    prev_best_1rm_kg: null,
    delta_kg: null,
    implement: null,
    side: null,
    current_e1rm_kg: null,
    next_pr_kg: null,
    next_pr_weeks: null,
    is_stale: false,
    ...overrides,
  };
}

describe("e1rmConfidenceQualifier", () => {
  it("shows the qualifier for reps > 10", () => {
    const q = e1rmConfidenceQualifier(
      pr({ reps: 12, load_kg: 60, best_1rm_kg: 90 }),
      "kg",
    );
    expect(q).toBe("estimated from 12x60.0 kg");
  });

  it("shows no qualifier for reps <= 10", () => {
    expect(
      e1rmConfidenceQualifier(pr({ reps: 10, load_kg: 60 }), "kg"),
    ).toBeNull();
  });

  it("never shows a qualifier for a true 1-rep max", () => {
    expect(
      e1rmConfidenceQualifier(pr({ reps: 1, load_kg: 100 }), "kg"),
    ).toBeNull();
  });
});

describe("prHeroValue / prSourceExpression — time-based PR rendering path", () => {
  it("renders the formatted time as the hero when only time_s is present (no blank hero)", () => {
    const timeBased = pr({
      load_kg: null,
      reps: null,
      time_s: 272,
      best_1rm_kg: 0,
    });
    expect(prHeroValue(timeBased, "kg")).toBe("4:32");
  });

  it("renders weight x reps for a normal weight-based PR", () => {
    expect(prSourceExpression(pr({ load_kg: 100, reps: 5 }), "kg")).toBe(
      "100.0 kg x 5",
    );
  });
});

describe("deltaKind — the 0.0-vs-null distinction (a real bug class)", () => {
  it("is 'none' when delta_kg is null", () => {
    expect(deltaKind(pr({ delta_kg: null }))).toBe("none");
  });

  it("is 'matched', never a green gain, when delta_kg is exactly 0.0", () => {
    expect(deltaKind(pr({ delta_kg: 0.0, prev_best_1rm_kg: 100 }))).toBe(
      "matched",
    );
  });

  it("is 'gain' for a real positive delta", () => {
    expect(deltaKind(pr({ delta_kg: 2.5 }))).toBe("gain");
  });
});

describe("trendDirection — only 'up' should ever be colored by callers", () => {
  it("is null when current_e1rm_kg is absent (insufficient data)", () => {
    expect(trendDirection(pr({ current_e1rm_kg: null }))).toBeNull();
  });

  it("is 'up' when current exceeds peak beyond the epsilon", () => {
    expect(trendDirection(pr({ best_1rm_kg: 100, current_e1rm_kg: 105 }))).toBe(
      "up",
    );
  });

  it("is 'down' when current trails peak beyond the epsilon", () => {
    expect(trendDirection(pr({ best_1rm_kg: 100, current_e1rm_kg: 95 }))).toBe(
      "down",
    );
  });

  it("is 'flat' within the epsilon band", () => {
    expect(
      trendDirection(pr({ best_1rm_kg: 100, current_e1rm_kg: 100.2 })),
    ).toBe("flat");
  });
});

describe("variantLabel", () => {
  it("is null with no implement or side", () => {
    expect(variantLabel(pr({ implement: null, side: null }))).toBeNull();
  });

  it("combines implement and side", () => {
    expect(variantLabel(pr({ implement: "dumbbell", side: "left" }))).toBe(
      "Dumbbell · Left",
    );
  });
});

describe("formatTime", () => {
  it("formats sub-hour durations as m:ss", () => {
    expect(formatTime(272)).toBe("4:32");
  });

  it("formats hour-plus durations as h:mm:ss", () => {
    expect(formatTime(3725)).toBe("1:02:05");
  });
});
