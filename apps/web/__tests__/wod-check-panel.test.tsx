import { describe, it, expect } from "vitest";

// Pure logic extracted from WodCheckPanel for unit testing.
// The component itself is async (fetch on submit), so we test the display logic.

type WodMovementResult = {
  movement: string;
  safe: boolean;
  driven_by: string[];
  substitutions: string[];
};

function classifyResults(results: WodMovementResult[]) {
  return {
    safe: results.filter((r) => r.safe).map((r) => r.movement),
    unsafe: results.filter((r) => !r.safe).map((r) => r.movement),
  };
}

describe("WodCheckPanel — result classification", () => {
  it("separates safe and unsafe movements", () => {
    const results: WodMovementResult[] = [
      {
        movement: "thruster",
        safe: false,
        driven_by: ["knee"],
        substitutions: ["goblet_squat"],
      },
      { movement: "pull_up", safe: true, driven_by: [], substitutions: [] },
      {
        movement: "double_under",
        safe: false,
        driven_by: ["knee"],
        substitutions: ["single_under"],
      },
    ];
    const { safe, unsafe } = classifyResults(results);
    expect(safe).toEqual(["pull_up"]);
    expect(unsafe).toHaveLength(2);
    expect(unsafe).toContain("thruster");
    expect(unsafe).toContain("double_under");
  });

  it("returns empty arrays when all movements are safe", () => {
    const results: WodMovementResult[] = [
      { movement: "pull_up", safe: true, driven_by: [], substitutions: [] },
      { movement: "ring_dip", safe: true, driven_by: [], substitutions: [] },
    ];
    const { safe, unsafe } = classifyResults(results);
    expect(unsafe).toHaveLength(0);
    expect(safe).toHaveLength(2);
  });

  it("handles empty result list", () => {
    const { safe, unsafe } = classifyResults([]);
    expect(safe).toHaveLength(0);
    expect(unsafe).toHaveLength(0);
  });
});
