import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MobileStrengthTrendCard } from "@/components/analytics/MobileStrengthTrendCard";
import type { PersonalRecord } from "@/lib/api";

const BASE_PR: PersonalRecord = {
  movement_id: "move-squat",
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

describe("MobileStrengthTrendCard", () => {
  it("renders the card title", () => {
    const html = renderToStaticMarkup(
      <MobileStrengthTrendCard
        personalRecords={[BASE_PR]}
        token="test-token"
      />,
    );
    expect(html).toContain("Strength trend");
  });

  it("defaults to the top-ranked PR movement name in the picker trigger", () => {
    const html = renderToStaticMarkup(
      <MobileStrengthTrendCard
        personalRecords={[BASE_PR]}
        token="test-token"
      />,
    );
    expect(html).toContain("Back Squat");
  });

  it("shows empty state text when no records are available", () => {
    const html = renderToStaticMarkup(
      <MobileStrengthTrendCard personalRecords={[]} token="test-token" />,
    );
    expect(html).toContain("log a strength set to see your trend");
  });

  it("renders period selector options for 3M, 6M, and All", () => {
    const html = renderToStaticMarkup(
      <MobileStrengthTrendCard
        personalRecords={[BASE_PR]}
        token="test-token"
      />,
    );
    expect(html).toContain("3M");
    expect(html).toContain("6M");
    expect(html).toContain("All");
  });

  it("renders the movement picker trigger element", () => {
    const html = renderToStaticMarkup(
      <MobileStrengthTrendCard
        personalRecords={[BASE_PR]}
        token="test-token"
      />,
    );
    // The trigger button should be rendered with the aria-label
    expect(html).toContain("Select movement");
  });

  it("accepts a custom className", () => {
    const html = renderToStaticMarkup(
      <MobileStrengthTrendCard
        personalRecords={[BASE_PR]}
        token="test-token"
        className="my-custom-class"
      />,
    );
    expect(html).toContain("my-custom-class");
  });
});
