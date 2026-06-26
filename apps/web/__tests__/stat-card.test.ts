import { describe, it, expect } from "vitest";
import { sparklinePath } from "@/components/ui/stat-card";

describe("sparklinePath", () => {
  it("returns empty for fewer than 2 points", () => {
    expect(sparklinePath([], 72, 22)).toBe("");
    expect(sparklinePath([5], 72, 22)).toBe("");
  });

  it("maps the lowest value to the bottom and the highest to the top", () => {
    // Two points [0, 10] over a 72x22 box: first at y=22 (min→bottom),
    // last at y=0 (max→top), x spanning full width.
    expect(sparklinePath([0, 10], 72, 22)).toBe("M0.0,22.0 L72.0,0.0");
  });

  it("handles a flat series without dividing by zero", () => {
    // Equal values → range guard keeps every y at the bottom.
    expect(sparklinePath([5, 5, 5], 72, 22)).toBe(
      "M0.0,22.0 L36.0,22.0 L72.0,22.0",
    );
  });
});
