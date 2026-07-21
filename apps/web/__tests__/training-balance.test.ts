import { describe, it, expect } from "vitest";
import {
  sortByVolumePctDesc,
  isZeroLoadBreakdown,
  categoryLabel,
} from "@/lib/analytics/training-balance";
import type { TrainingBalanceBreakdown } from "@/lib/api";

function cat(
  category: string,
  volume_pct: number,
  load_au: number,
): TrainingBalanceBreakdown {
  return { category, volume_pct, load_au };
}

describe("sortByVolumePctDesc", () => {
  it("sorts descending without mutating the input array", () => {
    const input = [
      cat("legs", 0.2, 200),
      cat("push", 0.5, 500),
      cat("pull", 0.3, 300),
    ];
    const sorted = sortByVolumePctDesc(input);
    expect(sorted.map((c) => c.category)).toEqual(["push", "pull", "legs"]);
    expect(input.map((c) => c.category)).toEqual(["legs", "push", "pull"]);
  });
});

describe("isZeroLoadBreakdown", () => {
  it("is false for an empty breakdown (the no-tagged-movements case)", () => {
    expect(isZeroLoadBreakdown([])).toBe(false);
  });

  it("is true when every row has load_au === 0", () => {
    expect(isZeroLoadBreakdown([cat("push", 0, 0), cat("pull", 0, 0)])).toBe(
      true,
    );
  });

  it("is false when any row has a nonzero load_au", () => {
    expect(
      isZeroLoadBreakdown([cat("push", 0.5, 500), cat("pull", 0, 0)]),
    ).toBe(false);
  });
});

describe("categoryLabel", () => {
  it("capitalizes and de-underscores a free-form category tag", () => {
    expect(categoryLabel("push")).toBe("Push");
    expect(categoryLabel("lower_back")).toBe("Lower back");
  });
});
