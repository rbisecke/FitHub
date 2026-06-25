import { describe, it, expect } from "vitest";
import { readinessSentence } from "@/lib/dashboard/readinessSentence";
import type { ReadinessResponse } from "@/lib/api";

function makeReadiness(
  score: number,
  label: ReadinessResponse["label"] = "optimal",
  recoveryScore?: number,
): ReadinessResponse {
  return {
    score,
    label,
    recovery_score: recoveryScore ?? null,
    acwr: null,
    acute_load: null,
    chronic_load: null,
  } as unknown as ReadinessResponse;
}

describe("readinessSentence", () => {
  it("returns comeback sentence when isComeback=true regardless of score", () => {
    const result = readinessSentence(makeReadiness(0.9, "optimal"), true);
    expect(result).toContain("Welcome back");
  });

  it("returns no-data sentence when readiness is null", () => {
    const result = readinessSentence(null);
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain("Welcome back");
  });

  it("returns insufficient-data sentence for label=insufficient_data", () => {
    const result = readinessSentence(makeReadiness(0.5, "insufficient_data"));
    expect(result).toContain("Log a few more");
  });

  it("returns fresh sentence for score > 0.7", () => {
    const result = readinessSentence(makeReadiness(0.8));
    expect(result).toContain("fresh");
  });

  it("returns steady sentence for score in [0.5, 0.7]", () => {
    const result = readinessSentence(makeReadiness(0.6));
    expect(result).toContain("good shape");
  });

  it("returns moderate fatigue sentence for score in [0.3, 0.5)", () => {
    const result = readinessSentence(makeReadiness(0.4, "high_load"));
    expect(result).toMatch(/fatigue|lighter/i);
  });

  it("returns recovery sentence for score < 0.3", () => {
    const result = readinessSentence(makeReadiness(0.2, "fatigued"));
    expect(result).toContain("recovery");
  });

  it("comeback overrides a high readiness score", () => {
    const result = readinessSentence(makeReadiness(0.95, "optimal"), true);
    expect(result).toBe("Welcome back — start steady and rebuild momentum.");
  });
});
