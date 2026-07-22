import { describe, it, expect } from "vitest";
import { matchFollowUpChips } from "@/lib/coach/follow-up-chips";

describe("matchFollowUpChips", () => {
  it("returns no chips when nothing matches", () => {
    expect(matchFollowUpChips("Great job on your last workout!")).toEqual([]);
  });

  it("matches a single keyword", () => {
    const chips = matchFollowUpChips(
      "You should take a deload this week to recover.",
    );
    expect(chips).toEqual([{ id: "deload", label: "Why a deload?" }]);
  });

  it("is case-insensitive", () => {
    const chips = matchFollowUpChips("Your ACWR is trending high.");
    expect(chips).toEqual([{ id: "acwr", label: "What's a safe ACWR range?" }]);
  });

  it("caps at 2 chips, first-match-wins by keyword-list order", () => {
    // Matches deload, ACWR, RPE, and rest day — bank order caps it at the
    // first two (deload, acwr), not the first two encountered in the text.
    const chips = matchFollowUpChips(
      "Consider a rest day, watch your RPE, and check your ACWR before your deload.",
    );
    expect(chips).toEqual([
      { id: "deload", label: "Why a deload?" },
      { id: "acwr", label: "What's a safe ACWR range?" },
    ]);
  });

  it("matches the rest/recovery keyword group", () => {
    expect(matchFollowUpChips("Make sure you prioritize recovery.")).toEqual([
      { id: "rest-recovery", label: "How many rest days do I need?" },
    ]);
    expect(matchFollowUpChips("Take a rest day tomorrow.")).toEqual([
      { id: "rest-recovery", label: "How many rest days do I need?" },
    ]);
  });

  it("never produces more than 2 chips even with every keyword present", () => {
    const chips = matchFollowUpChips(
      "deload acwr rpe rest day recovery acute:chronic",
    );
    expect(chips.length).toBe(2);
  });
});
