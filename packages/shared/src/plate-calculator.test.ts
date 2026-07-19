import { describe, it, expect } from "vitest";
import {
  warmupRamp,
  plateBreakdown,
  closestAchievableWeight,
  BAR_WEIGHT,
} from "./plate-calculator";

describe("plateBreakdown", () => {
  it("loads an exact per-side breakdown for a clean kg target", () => {
    // 100kg on a 20kg bar -> 40kg/side -> 25 + 15
    const b = plateBreakdown(100, "kg");
    expect(b.exact).toBe(true);
    expect(b.belowBar).toBe(false);
    expect(b.achievedWeight).toBe(100);
    expect(b.perSide).toEqual([
      { plate: 25, count: 1 },
      { plate: 15, count: 1 },
    ]);
  });

  it("loads an exact per-side breakdown for a clean lb target", () => {
    // 135lb on a 45lb bar -> 45/side -> one 45
    const b = plateBreakdown(135, "lb");
    expect(b.exact).toBe(true);
    expect(b.achievedWeight).toBe(135);
    expect(b.perSide).toEqual([{ plate: 45, count: 1 }]);
  });

  it("handles a target below the bar weight as 'bar only'", () => {
    const b = plateBreakdown(15, "kg");
    expect(b.belowBar).toBe(true);
    expect(b.exact).toBe(false);
    expect(b.perSide).toHaveLength(0);
    expect(b.achievedWeight).toBe(BAR_WEIGHT.kg);
  });

  it("treats an exactly-bar-weight target as exact bar-only", () => {
    const b = plateBreakdown(20, "kg");
    expect(b.belowBar).toBe(false);
    expect(b.exact).toBe(true);
    expect(b.perSide).toHaveLength(0);
    expect(b.achievedWeight).toBe(20);
  });

  it("returns the closest achievable weight for a sub-minimum remainder", () => {
    // 21kg on a 20kg bar -> 0.5kg/side, under the 1.25kg minimum -> closest 20kg
    const b = plateBreakdown(21, "kg");
    expect(b.exact).toBe(false);
    expect(b.achievedWeight).toBe(20);
    expect(b.perSide).toHaveLength(0);
  });

  it("uses multiple plates of the same size when needed", () => {
    // 160kg on 20kg bar -> 70kg/side -> 25 + 25 + 20
    const b = plateBreakdown(160, "kg");
    expect(b.achievedWeight).toBe(160);
    expect(b.perSide).toEqual([
      { plate: 25, count: 2 },
      { plate: 20, count: 1 },
    ]);
  });
});

describe("closestAchievableWeight", () => {
  it("clamps below-bar targets up to the bar", () => {
    expect(closestAchievableWeight(10, "kg")).toBe(20);
  });
  it("rounds a raw weight down to the nearest loadable total", () => {
    expect(closestAchievableWeight(101, "kg")).toBe(100);
  });
});

describe("warmupRamp", () => {
  it("produces the standard three-step ramp with plate-achievable weights", () => {
    const ramp = warmupRamp(100, "kg");
    expect(ramp).toHaveLength(3);
    expect(ramp[0]).toMatchObject({ label: "Bar", weight: 20, reps: 5 });
    expect(ramp[1]).toMatchObject({ percent: 50, reps: 3 });
    expect(ramp[2]).toMatchObject({ percent: 80, reps: 3 });
    // ramp weights must be loadable (round-trip through the breakdown)
    for (const step of ramp) {
      expect(closestAchievableWeight(step.weight, "kg")).toBe(step.weight);
    }
    // and monotonically increasing
    expect(ramp[0]!.weight).toBeLessThan(ramp[1]!.weight);
    expect(ramp[1]!.weight).toBeLessThan(ramp[2]!.weight);
  });
});
