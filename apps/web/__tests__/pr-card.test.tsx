import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PRCard } from "@/components/records/PRCard";
import type { PersonalRecord } from "@/lib/api";

const BASE_PR: PersonalRecord = {
  movement_id: "move-123",
  movement_name: "Back Squat",
  best_1rm_kg: 120,
  achieved_at: "2025-01-15",
  workout_id: "wo-1",
  load_kg: 120,
  reps: 1,
  time_s: null,
  prev_best_1rm_kg: null,
  delta_kg: null,
  is_stale: false,
};

describe("PRCard", () => {
  it("card body navigates to /records/[movementId]", () => {
    const html = renderToStaticMarkup(
      <PRCard pr={BASE_PR} points={[]} isRecent={false} category="strength" />,
    );
    expect(html).toContain('href="/records/move-123"');
  });

  it("$ tag button still links to /log/tag", () => {
    const html = renderToStaticMarkup(
      <PRCard pr={BASE_PR} points={[]} isRecent={false} category="strength" />,
    );
    expect(html).toContain('href="/log/tag?movement_id=move-123"');
  });

  it("shows 'First PR' badge when delta_kg is null and no prev_best", () => {
    const html = renderToStaticMarkup(
      <PRCard pr={BASE_PR} points={[]} isRecent={false} category="strength" />,
    );
    expect(html).toContain("First PR");
  });

  it("shows server-computed delta_kg improvement badge when positive", () => {
    const pr = { ...BASE_PR, delta_kg: 5.0, prev_best_1rm_kg: 115 };
    const html = renderToStaticMarkup(
      <PRCard pr={pr} points={[]} isRecent={false} category="strength" />,
    );
    expect(html).toContain("↑ 5.0 kg vs prev PR");
    expect(html).not.toContain("First PR");
  });

  it("shows $ tag button on desktop cards", () => {
    const html = renderToStaticMarkup(
      <PRCard pr={BASE_PR} points={[]} isRecent={false} category="strength" />,
    );
    expect(html).toContain("$ tag");
  });

  // Strength intelligence section
  it("shows 'log 3+ sets' prompt when current_e1rm_kg is null", () => {
    const pr: PersonalRecord = { ...BASE_PR, current_e1rm_kg: null };
    const html = renderToStaticMarkup(
      <PRCard pr={pr} points={[]} isRecent={false} category="strength" />,
    );
    expect(html).toContain("log 3+ sets to unlock trend");
  });

  it("renders current e1RM when available", () => {
    const pr: PersonalRecord = {
      ...BASE_PR,
      current_e1rm_kg: 115.5,
      next_pr_kg: null,
      next_pr_weeks: null,
    };
    const html = renderToStaticMarkup(
      <PRCard pr={pr} points={[]} isRecent={false} category="strength" />,
    );
    expect(html).toContain("est. now — 115.5 kg");
  });

  it("renders on-trend projection when available", () => {
    const pr: PersonalRecord = {
      ...BASE_PR,
      current_e1rm_kg: 115.5,
      next_pr_kg: 117.5,
      next_pr_weeks: 3,
    };
    const html = renderToStaticMarkup(
      <PRCard pr={pr} points={[]} isRecent={false} category="strength" />,
    );
    expect(html).toContain("on trend");
    expect(html).toContain("117.5 kg");
    expect(html).toContain("3wk");
  });

  it("shows stale caveat when is_stale is true", () => {
    const pr: PersonalRecord = {
      ...BASE_PR,
      current_e1rm_kg: 115.0,
      is_stale: true,
    };
    const html = renderToStaticMarkup(
      <PRCard pr={pr} points={[]} isRecent={false} category="strength" />,
    );
    expect(html).toContain("last logged");
  });
});
