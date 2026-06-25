import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  buildTagLabel,
  computePrStatus,
  parseTimeText,
  readRecentMovements,
  writeRecentMovements,
} from "@/lib/tag";

// localStorage is unavailable in the node test environment — stub it
const makeLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};
vi.stubGlobal("localStorage", makeLocalStorageMock());

describe("parseTimeText", () => {
  it("parses mm:ss format", () => {
    expect(parseTimeText("6:32")).toBe(392);
    expect(parseTimeText("1:05")).toBe(65);
  });
  it("parses MMSS integer format", () => {
    expect(parseTimeText("632")).toBe(6 * 60 + 32);
  });
  it("returns null for empty input", () => {
    expect(parseTimeText("")).toBeNull();
  });
});

describe("buildTagLabel", () => {
  it("returns bare tag with no movement", () => {
    expect(buildTagLabel(null, "weight", null)).toBe("$ git tag");
  });
  it("returns slug with no value", () => {
    expect(buildTagLabel("Back Squat", "weight", null)).toBe(
      "$ git tag back-squat",
    );
  });
  it("builds weight label with kg", () => {
    expect(buildTagLabel("Back Squat", "weight", { load_kg: "120" })).toBe(
      "$ git tag back-squat-120kg",
    );
  });
  it("builds weight label with kg and reps", () => {
    expect(
      buildTagLabel("Back Squat", "weight", { load_kg: "120", reps: "3" }),
    ).toBe("$ git tag back-squat-120kg-x3");
  });
  it("builds time label", () => {
    expect(buildTagLabel("Fran", "time", { time_text: "6:32" })).toBe(
      "$ git tag fran-6m32s",
    );
  });
  it("replaces decimal dot with p", () => {
    expect(buildTagLabel("Snatch", "weight", { load_kg: "102.5" })).toBe(
      "$ git tag snatch-102p5kg",
    );
  });
  it("slugifies multi-word with special chars", () => {
    expect(buildTagLabel("Clean & Jerk", "weight", { load_kg: "100" })).toBe(
      "$ git tag clean-jerk-100kg",
    );
  });
});

describe("computePrStatus", () => {
  it("returns null with no values entered", () => {
    expect(computePrStatus("weight", {}, null)).toBeNull();
  });
  it("returns first for no prior result", () => {
    expect(computePrStatus("weight", { load_kg: "100" }, null)).toBe("first");
  });
  it("returns new-pr when load beats previous", () => {
    expect(
      computePrStatus(
        "weight",
        { load_kg: "120" },
        {
          result_type: "weight",
          load_kg: "100",
          reps: 5,
          time_s: null,
          distance_m: null,
          rounds: null,
          partial_reps: null,
          calories: null,
          watts: null,
          performed_at: "2026-01-01",
        },
      ),
    ).toBe("new-pr");
  });
  it("returns matches when load equals previous with same reps", () => {
    expect(
      computePrStatus(
        "weight",
        { load_kg: "100", reps: "5" },
        {
          result_type: "weight",
          load_kg: "100",
          reps: 5,
          time_s: null,
          distance_m: null,
          rounds: null,
          partial_reps: null,
          calories: null,
          watts: null,
          performed_at: "2026-01-01",
        },
      ),
    ).toBe("matches");
  });
  it("returns below when load is less than previous", () => {
    expect(
      computePrStatus(
        "weight",
        { load_kg: "80" },
        {
          result_type: "weight",
          load_kg: "100",
          reps: null,
          time_s: null,
          distance_m: null,
          rounds: null,
          partial_reps: null,
          calories: null,
          watts: null,
          performed_at: "2026-01-01",
        },
      ),
    ).toBe("below");
  });
  it("returns new-pr for faster time", () => {
    expect(
      computePrStatus(
        "time",
        { time_text: "5:30" },
        {
          result_type: "time",
          load_kg: null,
          reps: null,
          time_s: 392,
          distance_m: null,
          rounds: null,
          partial_reps: null,
          calories: null,
          watts: null,
          performed_at: "2026-01-01",
        },
      ),
    ).toBe("new-pr");
  });
  it("returns undefined (loading) when lastResult is undefined", () => {
    expect(computePrStatus("weight", { load_kg: "100" }, undefined)).toBeNull();
  });
});

describe("localStorage movement cache", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores and retrieves recent movements", () => {
    writeRecentMovements("abc-123", "Back Squat", "weight");
    const recent = readRecentMovements();
    expect(recent[0]).toMatchObject({
      movement_id: "abc-123",
      movement_name: "Back Squat",
      result_type: "weight",
    });
  });
  it("deduplicates on re-write", () => {
    writeRecentMovements("abc-123", "Back Squat", "weight");
    writeRecentMovements("abc-123", "Back Squat", "weight");
    const recent = readRecentMovements();
    expect(recent.filter((m) => m.movement_id === "abc-123")).toHaveLength(1);
  });
  it("prepends new entries to front", () => {
    writeRecentMovements("aaa", "Deadlift", "weight");
    writeRecentMovements("bbb", "Snatch", "weight");
    const recent = readRecentMovements();
    expect(recent[0]?.movement_id).toBe("bbb");
  });
});
