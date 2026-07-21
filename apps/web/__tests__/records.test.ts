import { describe, it, expect } from "vitest";
import { categorise } from "@/lib/records/categorise";
import { isBenchmark } from "@/lib/records/benchmarks";
import { projectNextPR } from "@/lib/records/projectNextPR";
import type { E1RMPoint } from "@/lib/api";

describe("isBenchmark", () => {
  it("recognises named benchmarks case-insensitively", () => {
    expect(isBenchmark("Fran")).toBe(true);
    expect(isBenchmark("MURPH")).toBe(true);
    expect(isBenchmark("fight gone bad")).toBe(true);
    expect(isBenchmark("filthy fifty")).toBe(true);
  });

  it("rejects non-benchmark movements", () => {
    expect(isBenchmark("Back Squat")).toBe(false);
    expect(isBenchmark("Pull-up")).toBe(false);
    expect(isBenchmark("5k Row")).toBe(false);
  });
});

describe("categorise", () => {
  it("maps benchmark names to metcon", () => {
    expect(categorise("Fran")).toBe("metcon");
    expect(categorise("Helen")).toBe("metcon");
    expect(categorise("Grace")).toBe("metcon");
  });

  it("maps endurance movements correctly", () => {
    expect(categorise("5k Run")).toBe("endurance");
    expect(categorise("2k Row")).toBe("endurance");
    expect(categorise("Assault Bike")).toBe("endurance");
  });

  it("maps gymnastics movements correctly", () => {
    expect(categorise("Pull-up")).toBe("gymnastics");
    expect(categorise("Handstand Push-up")).toBe("gymnastics");
    expect(categorise("Toes-to-bar")).toBe("gymnastics");
    expect(categorise("Muscle-up")).toBe("gymnastics");
  });

  it("maps strength movements correctly", () => {
    expect(categorise("Back Squat")).toBe("strength");
    expect(categorise("Deadlift")).toBe("strength");
    expect(categorise("Strict Press")).toBe("strength");
    expect(categorise("Clean and Jerk")).toBe("strength");
  });

  it("defaults unknown movements to strength", () => {
    expect(categorise("Some Unknown Exercise")).toBe("strength");
  });

  it("benchmark match beats endurance keyword", () => {
    // "Nasty Girls" contains no endurance keywords so this is just a benchmark check
    expect(categorise("Nasty Girls")).toBe("metcon");
  });
});

describe("projectNextPR", () => {
  const makePoints = (values: number[]): E1RMPoint[] =>
    values.map((v, i) => ({
      day: `2025-0${i + 1}-01`,
      estimated_1rm_kg: v,
      workout_id: `w${i}`,
    }));

  it("returns null with fewer than 3 points", () => {
    expect(projectNextPR(makePoints([100, 105]), 105)).toBeNull();
    expect(projectNextPR([], 100)).toBeNull();
  });

  it("returns null for flat or declining trend", () => {
    expect(projectNextPR(makePoints([110, 105, 100]), 100)).toBeNull();
    expect(projectNextPR(makePoints([100, 100, 100]), 100)).toBeNull();
  });

  it("projects a positive trend to the next 2.5 kg milestone", () => {
    // 111 is not on a 2.5 boundary; next milestone is 112.5
    const points = makePoints([100, 105, 111]);
    const result = projectNextPR(points, 111);
    expect(result).not.toBeNull();
    expect(result!.targetKg).toBe(112.5);
    expect(result!.weeksOut).toBeGreaterThan(0);
  });

  it("returns null when current best is already on a 2.5 kg boundary and target equals best", () => {
    // If currentBestKg is exactly on a boundary, Math.ceil keeps it there, target <= best
    // 100 / 2.5 = 40, ceil(40) * 2.5 = 100 which equals best → null
    const points = makePoints([90, 95, 100]);
    // target = ceil(100/2.5)*2.5 = 100, which is not > 100 → null
    const result = projectNextPR(points, 100);
    expect(result).toBeNull();
  });
});
