import { describe, it, expect } from "vitest";
import {
  summarizeActiveInjuries,
  shouldShowInjuryBanner,
} from "../lib/injuryUnion";
import type { InjuryOut } from "../lib/api/plans";

function makeInjury(overrides: Partial<InjuryOut>): InjuryOut {
  return {
    id: overrides.id ?? "id-1",
    user_id: "user-1",
    body_region: "knee",
    pain_level: 5,
    mechanism: null,
    notes: null,
    active: true,
    status: "active",
    requires_referral: false,
    substitutions: [],
    contraindicated: [],
    reported_at: "2026-07-10T00:00:00Z",
    resolved_at: null,
    cleared_at: null,
    restriction_notes: null,
    staleness_days: 2,
    ...overrides,
  } as InjuryOut;
}

describe("summarizeActiveInjuries", () => {
  it("returns zero counts for empty input", () => {
    const summary = summarizeActiveInjuries([]);
    expect(summary).toEqual({
      activeCount: 0,
      blockedMovementCount: 0,
      referralDominant: false,
    });
  });

  it("dedupes overlapping contraindicated movements across active injuries", () => {
    const injuries = [
      makeInjury({
        id: "1",
        body_region: "knee",
        contraindicated: ["back_squat", "box_jump", "lunge"],
      }),
      makeInjury({
        id: "2",
        body_region: "hip",
        contraindicated: ["back_squat", "deadlift"],
      }),
    ];
    const summary = summarizeActiveInjuries(injuries);
    expect(summary.activeCount).toBe(2);
    // back_squat overlaps -> union size 4, not 5
    expect(summary.blockedMovementCount).toBe(4);
    expect(summary.referralDominant).toBe(false);
  });

  it("ignores non-active injuries (cleared/permanent/resolved)", () => {
    const injuries = [
      makeInjury({
        id: "1",
        status: "active",
        contraindicated: ["back_squat"],
      }),
      makeInjury({
        id: "2",
        status: "cleared_with_restrictions",
        contraindicated: ["deadlift"],
      }),
      makeInjury({ id: "3", status: "permanent", contraindicated: ["snatch"] }),
      makeInjury({ id: "4", status: "resolved", contraindicated: ["clean"] }),
    ];
    const summary = summarizeActiveInjuries(injuries);
    expect(summary.activeCount).toBe(1);
    expect(summary.blockedMovementCount).toBe(1);
  });

  it("is referral-dominant when any active injury requires referral", () => {
    const injuries = [
      makeInjury({
        id: "1",
        requires_referral: false,
        contraindicated: ["back_squat"],
      }),
      makeInjury({
        id: "2",
        requires_referral: true,
        contraindicated: ["deadlift"],
      }),
    ];
    const summary = summarizeActiveInjuries(injuries);
    expect(summary.referralDominant).toBe(true);
  });

  it("a referral-required cleared injury does not make the summary referral-dominant", () => {
    const injuries = [
      makeInjury({ id: "1", status: "active", requires_referral: false }),
      makeInjury({
        id: "2",
        status: "cleared_with_restrictions",
        requires_referral: true,
      }),
    ];
    const summary = summarizeActiveInjuries(injuries);
    expect(summary.referralDominant).toBe(false);
  });
});

describe("shouldShowInjuryBanner", () => {
  it("is false below 2 active injuries", () => {
    expect(
      shouldShowInjuryBanner({
        activeCount: 0,
        blockedMovementCount: 0,
        referralDominant: false,
      }),
    ).toBe(false);
    expect(
      shouldShowInjuryBanner({
        activeCount: 1,
        blockedMovementCount: 3,
        referralDominant: false,
      }),
    ).toBe(false);
  });

  it("is true at 2 or more active injuries", () => {
    expect(
      shouldShowInjuryBanner({
        activeCount: 2,
        blockedMovementCount: 5,
        referralDominant: false,
      }),
    ).toBe(true);
    expect(
      shouldShowInjuryBanner({
        activeCount: 3,
        blockedMovementCount: 0,
        referralDominant: true,
      }),
    ).toBe(true);
  });
});
