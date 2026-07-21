// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecordsPRCard } from "@/components/records/RecordsPRCard";
import { groupRecordsByMovement } from "@/lib/records/groupByMovement";
import type { PersonalRecord } from "@/lib/api";

function pr(overrides: Partial<PersonalRecord>): PersonalRecord {
  return {
    movement_id: "m-1",
    movement_name: "Bench Press",
    best_1rm_kg: 100,
    achieved_at: "2026-06-01",
    workout_id: "w-1",
    load_kg: 100,
    reps: 1,
    time_s: null,
    prev_best_1rm_kg: null,
    delta_kg: null,
    implement: null,
    side: null,
    current_e1rm_kg: null,
    next_pr_kg: null,
    next_pr_weeks: null,
    is_stale: false,
    ...overrides,
  };
}

describe("RecordsPRCard", () => {
  it("renders a single-variant movement with no expand affix", () => {
    const [group] = groupRecordsByMovement([pr({})]);
    render(<RecordsPRCard group={group!} unit="kg" />);
    expect(screen.queryByText(/more variant/i)).toBeNull();
  });

  it("shows a '+1 more variant' affix for a multi-variant movement, hidden by default", () => {
    const barbell = pr({ implement: "barbell", best_1rm_kg: 100 });
    const dumbbell = pr({ implement: "dumbbell", best_1rm_kg: 60 });
    const [group] = groupRecordsByMovement([dumbbell, barbell]);
    render(<RecordsPRCard group={group!} unit="kg" />);
    expect(screen.getByText("+1 more variant")).toBeTruthy();
    // The headline (barbell) variant label is shown; the dumbbell row is
    // collapsed until the affix is expanded.
    expect(screen.getByText("Barbell")).toBeTruthy();
    expect(screen.queryByText("Dumbbell")).toBeNull();
  });

  it("never renders a green '+0.0kg' chip for a matched (tied) PR", () => {
    const [group] = groupRecordsByMovement([
      pr({ delta_kg: 0.0, prev_best_1rm_kg: 100 }),
    ]);
    render(<RecordsPRCard group={group!} unit="kg" />);
    expect(screen.queryByText(/\+0\.0/)).toBeNull();
    expect(screen.getByText(/matched prev\. PR/)).toBeTruthy();
  });
});
