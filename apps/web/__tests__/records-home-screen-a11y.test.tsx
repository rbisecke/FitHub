// @vitest-environment jsdom
/**
 * Effort 11.5 axe coverage gap-fill: RecordsHomeScreen (Domain 04, Effort 6 —
 * Records & Analytics) is the real, routed `/progress/records` screen (unlike
 * components/analytics/PeriodSelector, which the audit found has zero live
 * callers) and had zero automated a11y coverage.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { RecordsHomeScreen } from "@/components/records/RecordsHomeScreen";
import type { PersonalRecord } from "@/lib/api";

function record(overrides: Partial<PersonalRecord>): PersonalRecord {
  return {
    movement_id: "m1",
    movement_name: "Back Squat",
    best_1rm_kg: 140,
    achieved_at: "2026-07-01",
    workout_id: "w1",
    is_stale: false,
    ...overrides,
  };
}

describe("RecordsHomeScreen a11y", () => {
  it("has no axe violations with a populated PR list", async () => {
    const { container } = render(
      <RecordsHomeScreen
        token="tok"
        weightUnit="kg"
        initialData={[
          record({}),
          record({
            movement_id: "m2",
            movement_name: "Deadlift",
            best_1rm_kg: 180,
            is_stale: true,
          }),
        ]}
        initialLoadFailed={false}
      />,
    );
    await screen.findByText("Back Squat");
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no axe violations in the empty state", async () => {
    const { container } = render(
      <RecordsHomeScreen
        token="tok"
        weightUnit="kg"
        initialData={[]}
        initialLoadFailed={false}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
