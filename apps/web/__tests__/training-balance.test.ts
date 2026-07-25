import { describe, it, expect } from "vitest";
import {
  sortByVolumePctDesc,
  isZeroLoadBreakdown,
  categoryLabel,
  fillMissingCategories,
  ALL_TRAINING_BALANCE_CATEGORIES,
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

describe("fillMissingCategories", () => {
  it("adds a zero-value row for every canonical category missing from breakdown", () => {
    const filled = fillMissingCategories([cat("legs", 1, 500)]);
    expect(filled).toHaveLength(ALL_TRAINING_BALANCE_CATEGORIES.length);
    const legs = filled.find((c) => c.category === "legs");
    expect(legs).toEqual({ category: "legs", volume_pct: 1, load_au: 500 });
    for (const c of filled) {
      if (c.category !== "legs") {
        expect(c).toEqual({ category: c.category, volume_pct: 0, load_au: 0 });
      }
    }
  });

  it("leaves a breakdown that already has every category untouched", () => {
    const full = ALL_TRAINING_BALANCE_CATEGORIES.map((category, i) =>
      cat(category, 0.2 * (i + 1), 100 * (i + 1)),
    );
    expect(fillMissingCategories(full)).toHaveLength(full.length);
  });
});
