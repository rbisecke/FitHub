import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WeeklyVolumeSparklines } from "@/components/plans/WeeklyVolumeSparklines";
import type { MesocycleOut, PlannedSessionOut } from "@/lib/api/plans";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeMeso(overrides: Partial<MesocycleOut> = {}): MesocycleOut {
  return {
    id: "meso-1",
    name: "Accumulation",
    phase: "accumulation",
    week_start: 1,
    week_end: 4,
    focus: null,
    ...overrides,
  };
}

function makeSession(
  id: string,
  scheduledDate: string,
  overrides: Partial<PlannedSessionOut> = {},
): PlannedSessionOut {
  return {
    id,
    mesocycle_id: "meso-1",
    scheduled_date: scheduledDate,
    session_type: "strength",
    title: "Strength A",
    notes: null,
    status: "prescribed",
    items: [],
    ...overrides,
  };
}

// startDate "2025-01-06" is a Monday — week 1 = 01-06..01-12,
// week 2 = 01-13..01-19, week 3 = 01-20..01-26, week 4 = 01-27..02-02.

describe("WeeklyVolumeSparklines — PD3 phase-driven labeling", () => {
  it('labels a zero-session week in a non-deload phase "None," not "Deload"', () => {
    const mesocycles: MesocycleOut[] = [
      makeMeso({ phase: "accumulation", week_start: 1, week_end: 2 }),
      makeMeso({ phase: "intensification", week_start: 3, week_end: 4 }),
    ];
    // Only week 1 has a session — week 2 (still accumulation, non-deload)
    // has zero sessions and must be labeled "None", not "Deload".
    const sessions: PlannedSessionOut[] = [makeSession("s1", "2025-01-06")];

    const html = renderToStaticMarkup(
      <WeeklyVolumeSparklines
        sessions={sessions}
        mesocycles={mesocycles}
        startDate="2025-01-06"
        weeks={4}
      />,
    );

    expect(html).toContain("Week 2: 0 sessions — None");
    expect(html).not.toContain("Week 2: 0 sessions — Deload");
  });

  it('labels a zero-session week inside a real deload phase "Deload"', () => {
    const mesocycles: MesocycleOut[] = [
      makeMeso({ phase: "deload", week_start: 1, week_end: 1 }),
      makeMeso({ phase: "accumulation", week_start: 2, week_end: 4 }),
    ];
    // Week 1 is a real deload phase with zero sessions scheduled.
    const sessions: PlannedSessionOut[] = [makeSession("s1", "2025-01-13")];

    const html = renderToStaticMarkup(
      <WeeklyVolumeSparklines
        sessions={sessions}
        mesocycles={mesocycles}
        startDate="2025-01-06"
        weeks={4}
      />,
    );

    expect(html).toContain("Week 1: 0 sessions — Deload");
  });

  it("labels a non-empty week inside a real deload phase Deload, not by session count", () => {
    const mesocycles: MesocycleOut[] = [
      makeMeso({ phase: "deload", week_start: 1, week_end: 1 }),
      makeMeso({ phase: "accumulation", week_start: 2, week_end: 4 }),
    ];
    // Week 1 is deload but still has a couple of light sessions scheduled.
    const sessions: PlannedSessionOut[] = [
      makeSession("s1", "2025-01-06"),
      makeSession("s2", "2025-01-08"),
      // Week 2 has more sessions, establishing a higher max for ratio math.
      makeSession("s3", "2025-01-13"),
      makeSession("s4", "2025-01-14"),
      makeSession("s5", "2025-01-15"),
      makeSession("s6", "2025-01-16"),
    ];

    const html = renderToStaticMarkup(
      <WeeklyVolumeSparklines
        sessions={sessions}
        mesocycles={mesocycles}
        startDate="2025-01-06"
        weeks={4}
      />,
    );

    expect(html).toContain("Week 1: 2 sessions — Deload");
  });

  it("renders the None legend entry alongside Light/Moderate/Heavy/Deload", () => {
    const mesocycles: MesocycleOut[] = [
      makeMeso({ phase: "accumulation", week_start: 1, week_end: 4 }),
    ];
    const html = renderToStaticMarkup(
      <WeeklyVolumeSparklines
        sessions={[]}
        mesocycles={mesocycles}
        startDate="2025-01-06"
        weeks={4}
      />,
    );

    expect(html).toContain("None");
    expect(html).toContain("Light");
    expect(html).toContain("Moderate");
    expect(html).toContain("Heavy");
    expect(html).toContain("Deload");
  });
});
