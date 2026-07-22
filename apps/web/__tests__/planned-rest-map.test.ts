import { describe, it, expect } from "vitest";
import { buildPlannedRestMap } from "@/lib/dashboard/plannedRestMap";
import type { PlanDetail } from "@/lib/api/plans";

function makePlan(overrides: Partial<PlanDetail>): PlanDetail {
  return {
    id: "plan-1",
    archetype: "general-crossfit",
    title: "Test plan",
    branch_name: "feat/test-plan",
    weeks: 4,
    status: "active",
    start_date: "2026-01-01",
    end_date: "2026-01-28",
    created_at: "2026-01-01T00:00:00Z",
    mesocycles: [],
    sessions: [],
    corrections: [],
    ...overrides,
  };
}

describe("buildPlannedRestMap", () => {
  it("classifies a session with session_type rest as a rest day", () => {
    const plan = makePlan({
      mesocycles: [
        {
          id: "meso-1",
          name: "Block 1",
          phase: "accumulation",
          week_start: 1,
          week_end: 4,
          focus: null,
        },
      ],
      sessions: [
        {
          id: "s1",
          mesocycle_id: "meso-1",
          scheduled_date: "2026-01-05",
          session_type: "rest",
          title: "Rest",
          notes: null,
          status: "prescribed",
          items: [],
        },
      ],
    });

    const map = buildPlannedRestMap([plan]);
    expect(map.get("2026-01-05")).toBe("rest");
  });

  it("classifies active_recovery sessions as rest", () => {
    const plan = makePlan({
      mesocycles: [
        {
          id: "meso-1",
          name: "Block 1",
          phase: "accumulation",
          week_start: 1,
          week_end: 4,
          focus: null,
        },
      ],
      sessions: [
        {
          id: "s1",
          mesocycle_id: "meso-1",
          scheduled_date: "2026-01-06",
          session_type: "active_recovery",
          title: "Easy row",
          notes: null,
          status: "prescribed",
          items: [],
        },
      ],
    });

    expect(buildPlannedRestMap([plan]).get("2026-01-06")).toBe("rest");
  });

  it("classifies any session in a deload-phase mesocycle as deload, even a strength session", () => {
    const plan = makePlan({
      mesocycles: [
        {
          id: "meso-deload",
          name: "Deload week",
          phase: "deload",
          week_start: 5,
          week_end: 5,
          focus: null,
        },
      ],
      sessions: [
        {
          id: "s1",
          mesocycle_id: "meso-deload",
          scheduled_date: "2026-02-02",
          session_type: "strength",
          title: "Light squat",
          notes: null,
          status: "prescribed",
          items: [],
        },
      ],
    });

    expect(buildPlannedRestMap([plan]).get("2026-02-02")).toBe("deload");
  });

  it("does not classify an ordinary strength/metcon session in a non-deload mesocycle", () => {
    const plan = makePlan({
      mesocycles: [
        {
          id: "meso-1",
          name: "Block 1",
          phase: "accumulation",
          week_start: 1,
          week_end: 4,
          focus: null,
        },
      ],
      sessions: [
        {
          id: "s1",
          mesocycle_id: "meso-1",
          scheduled_date: "2026-01-07",
          session_type: "metcon",
          title: "Fran",
          notes: null,
          status: "prescribed",
          items: [],
        },
      ],
    });

    expect(buildPlannedRestMap([plan]).get("2026-01-07")).toBeUndefined();
  });

  it("merges classifications across multiple overlapping plans", () => {
    const planA = makePlan({
      id: "plan-a",
      mesocycles: [
        {
          id: "meso-a",
          name: "A",
          phase: "accumulation",
          week_start: 1,
          week_end: 2,
          focus: null,
        },
      ],
      sessions: [
        {
          id: "s1",
          mesocycle_id: "meso-a",
          scheduled_date: "2026-01-05",
          session_type: "rest",
          title: "Rest",
          notes: null,
          status: "prescribed",
          items: [],
        },
      ],
    });
    const planB = makePlan({
      id: "plan-b",
      mesocycles: [
        {
          id: "meso-b",
          name: "B",
          phase: "deload",
          week_start: 1,
          week_end: 1,
          focus: null,
        },
      ],
      sessions: [
        {
          id: "s2",
          mesocycle_id: "meso-b",
          scheduled_date: "2026-03-10",
          session_type: "strength",
          title: "Deload strength",
          notes: null,
          status: "prescribed",
          items: [],
        },
      ],
    });

    const map = buildPlannedRestMap([planA, planB]);
    expect(map.get("2026-01-05")).toBe("rest");
    expect(map.get("2026-03-10")).toBe("deload");
    expect(map.size).toBe(2);
  });
});
