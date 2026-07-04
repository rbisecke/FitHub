import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MovementDetailShell } from "@/components/records/MovementDetailShell";
import type {
  PersonalRecord,
  E1RMPoint,
  MovementHistoryEntry,
} from "@/lib/api";

const BASE_PR: PersonalRecord = {
  movement_id: "move-abc",
  movement_name: "Back Squat",
  best_1rm_kg: 140,
  achieved_at: "2025-06-01",
  workout_id: "wo-1",
  load_kg: 140,
  reps: 1,
  time_s: null,
  prev_best_1rm_kg: null,
  delta_kg: null,
  is_stale: false,
  current_e1rm_kg: null,
  next_pr_kg: null,
  next_pr_weeks: null,
};

const HISTORY_ROW: MovementHistoryEntry = {
  date: "2025-06-01",
  load_kg: 140,
  reps: 1,
  estimated_1rm_kg: 140,
  notes: "felt strong",
  workout_id: "wo-1",
  is_pr: true,
};

const TREND_POINT: E1RMPoint = {
  day: "2025-06-01",
  estimated_1rm_kg: 140,
  workout_id: "wo-1",
};

describe("MovementDetailShell", () => {
  it("renders the movement name in the heading", () => {
    const html = renderToStaticMarkup(
      <MovementDetailShell
        pr={BASE_PR}
        category="strength"
        weightUnit="kg"
        trendPoints={[]}
        history={[]}
      />,
    );
    expect(html).toContain("Back Squat");
  });

  it("renders the all-time best e1RM", () => {
    const html = renderToStaticMarkup(
      <MovementDetailShell
        pr={BASE_PR}
        category="strength"
        weightUnit="kg"
        trendPoints={[]}
        history={[]}
      />,
    );
    expect(html).toContain("140.0");
    expect(html).toContain("all-time best");
  });

  it("tag link points to /log/tag with movement_id", () => {
    const html = renderToStaticMarkup(
      <MovementDetailShell
        pr={BASE_PR}
        category="strength"
        weightUnit="kg"
        trendPoints={[]}
        history={[]}
      />,
    );
    expect(html).toContain('href="/log/tag?movement_id=move-abc"');
  });

  it("back link points to /records", () => {
    const html = renderToStaticMarkup(
      <MovementDetailShell
        pr={BASE_PR}
        category="strength"
        weightUnit="kg"
        trendPoints={[]}
        history={[]}
      />,
    );
    expect(html).toContain('href="/records"');
  });

  it("shows empty state when no history", () => {
    const html = renderToStaticMarkup(
      <MovementDetailShell
        pr={BASE_PR}
        category="strength"
        weightUnit="kg"
        trendPoints={[]}
        history={[]}
      />,
    );
    expect(html).toContain("No results logged yet");
  });

  it("renders the sets table when history is non-empty", () => {
    const html = renderToStaticMarkup(
      <MovementDetailShell
        pr={BASE_PR}
        category="strength"
        weightUnit="kg"
        trendPoints={[TREND_POINT]}
        history={[HISTORY_ROW]}
      />,
    );
    expect(html).toContain("logged sets");
    expect(html).toContain("1 entry");
    expect(html).toContain("felt strong");
  });

  it("marks PR rows with 'PR' label in the table", () => {
    const html = renderToStaticMarkup(
      <MovementDetailShell
        pr={BASE_PR}
        category="strength"
        weightUnit="kg"
        trendPoints={[TREND_POINT]}
        history={[HISTORY_ROW]}
      />,
    );
    // PR badge should appear for the is_pr row
    expect(html).toContain(">PR<");
  });

  it("shows current e1RM when available", () => {
    const pr: PersonalRecord = {
      ...BASE_PR,
      current_e1rm_kg: 135.5,
      next_pr_kg: 137.5,
      next_pr_weeks: 3,
    };
    const html = renderToStaticMarkup(
      <MovementDetailShell
        pr={pr}
        category="strength"
        weightUnit="kg"
        trendPoints={[]}
        history={[]}
      />,
    );
    expect(html).toContain("135.5");
    expect(html).toContain("est. now");
    expect(html).toContain("on trend");
    expect(html).toContain("137.5");
    expect(html).toContain("3wk");
  });

  it("shows stale caveat when is_stale is true", () => {
    const pr: PersonalRecord = {
      ...BASE_PR,
      current_e1rm_kg: 130.0,
      is_stale: true,
    };
    const html = renderToStaticMarkup(
      <MovementDetailShell
        pr={pr}
        category="strength"
        weightUnit="kg"
        trendPoints={[]}
        history={[]}
      />,
    );
    expect(html).toContain("last logged");
  });

  it("renders the category pill with the correct label", () => {
    const html = renderToStaticMarkup(
      <MovementDetailShell
        pr={BASE_PR}
        category="strength"
        weightUnit="kg"
        trendPoints={[]}
        history={[]}
      />,
    );
    expect(html).toContain("Strength");
  });
});
