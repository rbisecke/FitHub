import { describe, it, expect } from "vitest";
import {
  groupRecordsByMovement,
  variantKey,
} from "@/lib/records/groupByMovement";
import { sortMovementGroups } from "@/lib/records/sortRecords";
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

describe("groupRecordsByMovement", () => {
  it("groups single-variant movements into a one-variant group with no affix implied", () => {
    const groups = groupRecordsByMovement([pr({})]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.variants).toHaveLength(1);
    expect(groups[0]!.headline).toBe(groups[0]!.variants[0]);
  });

  it("groups a movement's barbell and dumbbell variants under one movement_id, best first (BG-23)", () => {
    const barbell = pr({ implement: "barbell", best_1rm_kg: 100 });
    const dumbbell = pr({ implement: "dumbbell", best_1rm_kg: 60 });
    const groups = groupRecordsByMovement([dumbbell, barbell]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.variants).toHaveLength(2);
    expect(groups[0]!.headline.implement).toBe("barbell");
    expect(groups[0]!.variants[1]!.implement).toBe("dumbbell");
  });

  it("keeps movements with different movement_id in separate groups", () => {
    const a = pr({ movement_id: "m-1" });
    const b = pr({ movement_id: "m-2", movement_name: "Back Squat" });
    const groups = groupRecordsByMovement([a, b]);
    expect(groups).toHaveLength(2);
  });
});

describe("variantKey", () => {
  it("is unique per (movement, implement, side) so it's safe as a React list key", () => {
    const a = pr({ implement: "barbell", side: null });
    const b = pr({ implement: "dumbbell", side: null });
    expect(variantKey(a)).not.toBe(variantKey(b));
  });
});

describe("sortMovementGroups", () => {
  const groups = groupRecordsByMovement([
    pr({
      movement_id: "m-1",
      movement_name: "Zercher Squat",
      best_1rm_kg: 80,
      achieved_at: "2026-01-01",
    }),
    pr({
      movement_id: "m-2",
      movement_name: "Back Squat",
      best_1rm_kg: 150,
      achieved_at: "2026-06-01",
      delta_kg: 5,
    }),
    pr({
      movement_id: "m-3",
      movement_name: "Deadlift",
      best_1rm_kg: 180,
      achieved_at: "2026-03-01",
    }),
  ]);

  it("a_z sorts alphabetically", () => {
    const sorted = sortMovementGroups(groups, "a_z");
    expect(sorted.map((g) => g.movementName)).toEqual([
      "Back Squat",
      "Deadlift",
      "Zercher Squat",
    ]);
  });

  it("heaviest sorts by headline best_1rm_kg descending", () => {
    const sorted = sortMovementGroups(groups, "heaviest");
    expect(sorted.map((g) => g.movementName)).toEqual([
      "Deadlift",
      "Back Squat",
      "Zercher Squat",
    ]);
  });

  it("stalest sorts by oldest achieved_at first", () => {
    const sorted = sortMovementGroups(groups, "stalest");
    expect(sorted.map((g) => g.movementName)).toEqual([
      "Zercher Squat",
      "Deadlift",
      "Back Squat",
    ]);
  });

  it("recently_moved prioritizes a positive delta_kg ahead of a more recent non-improving PR", () => {
    const sorted = sortMovementGroups(groups, "recently_moved");
    // Back Squat has a positive delta_kg — it leads even though Deadlift's
    // achieved_at is earlier and Zercher's is earliest.
    expect(sorted[0]!.movementName).toBe("Back Squat");
  });
});
