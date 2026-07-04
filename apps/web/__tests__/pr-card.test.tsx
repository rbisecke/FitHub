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
};

describe("PRCard", () => {
  it("links to /log/tag?movement_id=[id] on mobile and desktop", () => {
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
});
