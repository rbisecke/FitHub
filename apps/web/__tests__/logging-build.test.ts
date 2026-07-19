import { describe, expect, it } from "vitest";
import {
  buildCreateWorkout,
  computeVolumeKg,
  countSets,
  epley1rm,
  parseFlexibleTime,
} from "@/components/logging/logBuild";
import {
  columnsFor,
  isMultiSet,
  previousValueFor,
} from "@/components/logging/resultColumns";
import type { DraftEntry, DraftSession } from "@/components/logging/types";
import { emptySet } from "@/components/logging/types";
import type { Movement } from "@/lib/api";

function movement(): Movement {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Back Squat",
    slug: "back-squat",
    base_movement: "Back Squat",
    modality: "strength",
    start_position: null,
    catch_position: null,
    pause_position: null,
    tempo: null,
    execution_style: null,
    movement_pattern: "squat",
    limb_style: "bilateral",
    implement: "barbell",
    default_result_types: ["weight"],
    default_result_type: "weight",
    is_official: true,
    created_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function entry(overrides: Partial<DraftEntry> = {}): DraftEntry {
  return {
    id: "e1",
    movement: movement(),
    resultType: "weight",
    implement: "barbell",
    side: null,
    note: "",
    scaled: false,
    sets: [{ ...emptySet(), load: "100", reps: "5" }],
    previous: [],
    bestE1rmKg: null,
    contextState: "idle",
    ...overrides,
  };
}

function session(entries: DraftEntry[]): DraftSession {
  return {
    title: "Leg day",
    sessionType: "strength",
    workoutFormat: null,
    sessionRpe: null,
    durationInput: "",
    timeCapInput: "",
    location: "",
    bodyweight: "",
    notes: "",
    entries,
  };
}

describe("parseFlexibleTime (01 §8)", () => {
  it("parses colon notation", () => {
    expect(parseFlexibleTime("7:12")).toBe(432);
  });
  it("parses 3+ digits as m:ss", () => {
    expect(parseFlexibleTime("712")).toBe(432);
  });
  it("parses 1-2 digits as raw seconds", () => {
    expect(parseFlexibleTime("45")).toBe(45);
  });
  it("returns null for empty/garbage", () => {
    expect(parseFlexibleTime("")).toBeNull();
    expect(parseFlexibleTime("abc")).toBeNull();
  });
});

describe("epley1rm", () => {
  it("computes within the valid rep range", () => {
    expect(epley1rm(100, 5)).toBeCloseTo(116.666, 2);
  });
  it("returns null outside 1..36 reps", () => {
    expect(epley1rm(100, 0)).toBeNull();
    expect(epley1rm(100, 37)).toBeNull();
  });
});

describe("resultColumns (01 §2.6)", () => {
  it("adapts columns per result type", () => {
    expect(columnsFor("weight", "kg").map((c) => c.key)).toEqual([
      "load",
      "reps",
    ]);
    expect(columnsFor("time", "kg").map((c) => c.key)).toEqual(["time"]);
    expect(columnsFor("rounds_reps", "kg").map((c) => c.key)).toEqual([
      "rounds",
      "partialReps",
    ]);
  });
  it("labels the load column by weight unit", () => {
    expect(columnsFor("weight", "lb")[0]!.label).toBe("lb");
  });
  it("only weight/reps are multi-set", () => {
    expect(isMultiSet("weight")).toBe(true);
    expect(isMultiSet("time")).toBe(false);
  });
  it("formats a previous time value as m:ss", () => {
    const timeCol = columnsFor("time", "kg")[0]!;
    expect(previousValueFor({ time_s: 432 }, timeCol)).toBe("7:12");
  });
});

describe("buildCreateWorkout (01 §2.7, §2.12)", () => {
  it("encodes order_index as entryIndex*100 + set_index and carries scaled", () => {
    const e = entry({
      scaled: true,
      sets: [
        { ...emptySet(), load: "100", reps: "5" },
        { ...emptySet(), load: "102.5", reps: "3" },
      ],
    });
    const body = buildCreateWorkout(session([e]), "2026-07-19T10:00:00Z");
    const results = body.results ?? [];
    expect(results).toHaveLength(2);
    expect(results[0]!.order_index).toBe(0);
    expect(results[1]!.order_index).toBe(1);
    expect(results[0]!.set_index).toBe(0);
    expect(results.every((r) => r.scaled === true)).toBe(true);
    expect(results[0]!.load_kg).toBe(100);
    expect(results[0]!.reps).toBe(5);
  });

  it("computes live volume and set count", () => {
    const s = session([entry()]);
    expect(computeVolumeKg(s)).toBe(500);
    expect(countSets(s)).toBe(1);
  });

  it("keeps a zero-result rest day valid (§2.13)", () => {
    const body = buildCreateWorkout(session([]), "2026-07-19T10:00:00Z");
    expect(body.results).toEqual([]);
  });
});
