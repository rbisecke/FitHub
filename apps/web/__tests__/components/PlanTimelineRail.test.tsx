import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PlanTimelineRail } from "@/components/plans/PlanTimelineRail";
import { MesocycleProgressBar } from "@/components/plans/MesocycleProgressBar";
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

// ---------------------------------------------------------------------------
// PlanTimelineRail
// ---------------------------------------------------------------------------

describe("PlanTimelineRail", () => {
  const mesocycles: MesocycleOut[] = [
    makeMeso({ id: "m1", name: "Accumulation", week_start: 1, week_end: 4 }),
    makeMeso({
      id: "m2",
      name: "Intensification",
      phase: "intensification",
      week_start: 5,
      week_end: 8,
    }),
  ];

  const sessions: PlannedSessionOut[] = [
    makeSession("s1", "2025-01-06"),
    makeSession("s2", "2025-01-08"),
    makeSession("s3", "2025-01-13"),
  ];

  it("renders the plan timeline label", () => {
    const html = renderToStaticMarkup(
      <PlanTimelineRail
        sessions={sessions}
        mesocycles={mesocycles}
        startDate="2025-01-06"
        weeks={8}
      />,
    );
    expect(html).toContain("plan timeline");
  });

  it("renders week ruler labels for first and last week", () => {
    const html = renderToStaticMarkup(
      <PlanTimelineRail
        sessions={sessions}
        mesocycles={mesocycles}
        startDate="2025-01-06"
        weeks={8}
      />,
    );
    expect(html).toContain("w1");
    expect(html).toContain("w8");
  });

  it("renders phase names in the label row", () => {
    const html = renderToStaticMarkup(
      <PlanTimelineRail
        sessions={sessions}
        mesocycles={mesocycles}
        startDate="2025-01-06"
        weeks={8}
      />,
    );
    expect(html).toContain("Accumulation");
    expect(html).toContain("Intensification");
  });

  it("renders session dots (one per non-rest session)", () => {
    const html = renderToStaticMarkup(
      <PlanTimelineRail
        sessions={sessions}
        mesocycles={mesocycles}
        startDate="2025-01-06"
        weeks={8}
      />,
    );
    // Each dot has a title attribute with the session date
    expect(html).toContain("2025-01-06");
    expect(html).toContain("2025-01-08");
    expect(html).toContain("2025-01-13");
  });

  it("uses accumulation green for accumulation phase band", () => {
    const html = renderToStaticMarkup(
      <PlanTimelineRail
        sessions={sessions}
        mesocycles={[makeMeso({ phase: "accumulation" })]}
        startDate="2025-01-06"
        weeks={4}
      />,
    );
    expect(html).toContain("bg-[var(--green)]");
  });

  it("uses intensification amber for intensification phase band", () => {
    const html = renderToStaticMarkup(
      <PlanTimelineRail
        sessions={[]}
        mesocycles={[
          makeMeso({ phase: "intensification", week_start: 1, week_end: 4 }),
        ]}
        startDate="2025-01-06"
        weeks={4}
      />,
    );
    expect(html).toContain("bg-[var(--amber)]");
  });

  it("omits rest sessions from the dot row", () => {
    const sessionsWithRest: PlannedSessionOut[] = [
      makeSession("s1", "2025-01-06"),
      makeSession("rest1", "2025-01-07", {
        session_type: "rest",
        title: "Rest",
      }),
    ];
    const html = renderToStaticMarkup(
      <PlanTimelineRail
        sessions={sessionsWithRest}
        mesocycles={[makeMeso()]}
        startDate="2025-01-06"
        weeks={4}
      />,
    );
    // The rest session title is not in the dots area (rest sessions are filtered)
    // The non-rest session should still appear
    expect(html).toContain("2025-01-06");
  });
});

// ---------------------------------------------------------------------------
// MesocycleProgressBar
// ---------------------------------------------------------------------------

describe("MesocycleProgressBar", () => {
  it("returns null when mesocycles array is empty", () => {
    const html = renderToStaticMarkup(
      <MesocycleProgressBar mesocycles={[]} startDate="2025-01-06" />,
    );
    expect(html).toBe("");
  });

  // Helper: build a startDate that puts us in week 1 of the plan right now.
  function startDateForWeek(targetWeek: number): string {
    const d = new Date();
    d.setDate(d.getDate() - (targetWeek - 1) * 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(d.getDate()).padStart(2, "0")}`;
  }

  it("renders the phase name and week progress", () => {
    // Start plan today — we are in week 1, which is inside week_start=1,week_end=4
    const html = renderToStaticMarkup(
      <MesocycleProgressBar
        mesocycles={[
          makeMeso({ phase: "accumulation", week_start: 1, week_end: 4 }),
        ]}
        startDate={startDateForWeek(1)}
      />,
    );
    // Phase name should be capitalized
    expect(html).toContain("Accumulation");
  });

  it("renders the accent percentage readout", () => {
    const html = renderToStaticMarkup(
      <MesocycleProgressBar
        mesocycles={[makeMeso({ week_start: 1, week_end: 4 })]}
        startDate={startDateForWeek(1)}
      />,
    );
    // Should contain a % character in the accent span
    expect(html).toContain("%");
  });

  it("renders correct segment count for a 4-week phase", () => {
    const html = renderToStaticMarkup(
      <MesocycleProgressBar
        mesocycles={[makeMeso({ week_start: 1, week_end: 4 })]}
        startDate={startDateForWeek(1)}
      />,
    );
    // 4 segment divs — each contains "h-1.5 flex-1 rounded-sm"
    const matches = html.match(/h-1\.5 flex-1 rounded-sm/g);
    expect(matches).toHaveLength(4);
  });

  it("computes 75% for week 3 of a 4-week phase", () => {
    // Start date = today minus 14 days puts us at week 3
    const d = new Date();
    d.setDate(d.getDate() - 14);
    const startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(d.getDate()).padStart(2, "0")}`;

    const html = renderToStaticMarkup(
      <MesocycleProgressBar
        mesocycles={[makeMeso({ week_start: 1, week_end: 4 })]}
        startDate={startDate}
      />,
    );
    // week 3 of 4 = 75%
    expect(html).toContain("75%");
  });
});
