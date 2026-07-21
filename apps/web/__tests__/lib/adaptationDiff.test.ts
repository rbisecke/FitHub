import { describe, it, expect } from "vitest";
import {
  formatSetsReps,
  formatLoad,
  summarizeAdaptationMagnitude,
  sessionMagnitudeLabel,
  triggerReasonCopy,
  computeManualRevisionDiff,
  isAdaptationDiffStale,
  sessionsChangedBetweenDiffs,
} from "@/lib/adaptationDiff";
import type {
  AdaptationSessionDiff,
  PlannedItemOut,
  PlannedSessionOut,
} from "@/lib/api/plans";

function item(overrides: Partial<PlannedItemOut> = {}): PlannedItemOut {
  return {
    id: "item-1",
    movement_name: "Back Squat",
    sets: 5,
    reps: "5",
    load_pct_1rm: 75,
    load_kg: 102,
    notes: null,
    item_order: 0,
    ...overrides,
  };
}

function session(
  overrides: Partial<PlannedSessionOut> = {},
): PlannedSessionOut {
  return {
    id: "session-1",
    mesocycle_id: "meso-1",
    scheduled_date: "2026-07-20",
    session_type: "strength",
    title: "Heavy Squat Day",
    notes: null,
    status: "prescribed",
    items: [item()],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// formatSetsReps / formatLoad
// ---------------------------------------------------------------------------

describe("formatSetsReps", () => {
  it("pairs sets and reps", () => {
    expect(formatSetsReps(5, "5")).toBe("5 × 5");
  });
  it("falls back to sets alone", () => {
    expect(formatSetsReps(5, null)).toBe("5 sets");
  });
  it("falls back to reps alone", () => {
    expect(formatSetsReps(null, "AMRAP")).toBe("AMRAP");
  });
  it("returns null when both are absent", () => {
    expect(formatSetsReps(null, null)).toBeNull();
    expect(formatSetsReps(undefined, undefined)).toBeNull();
  });
});

describe("formatLoad", () => {
  it("resolves the %1RM -> kg pairing symmetrically (design spec §6/§8.5)", () => {
    expect(formatLoad(75, 102)).toBe("75% · 102 kg");
  });
  it("falls back to percentage alone", () => {
    expect(formatLoad(75, null)).toBe("75%");
  });
  it("falls back to kg alone", () => {
    expect(formatLoad(null, 102)).toBe("102 kg");
  });
  it("returns null when both are absent", () => {
    expect(formatLoad(null, null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// summarizeAdaptationMagnitude / sessionMagnitudeLabel
// ---------------------------------------------------------------------------

describe("summarizeAdaptationMagnitude", () => {
  const diffs: AdaptationSessionDiff[] = [
    {
      session_id: "s1",
      session_title: "Squat Day",
      scheduled_date: null,
      change: "reduce_intensity",
      load_pct_delta: -10,
      volume_delta_sets: null,
      notes: "",
      item_changes: [],
    },
    {
      session_id: "s2",
      session_title: "Metcon Day",
      scheduled_date: null,
      change: "reduce_volume",
      load_pct_delta: null,
      volume_delta_sets: -6,
      notes: "",
      item_changes: [],
    },
  ];

  it("counts sessions changed and sums the volume delta", () => {
    const summary = summarizeAdaptationMagnitude(diffs);
    expect(summary.sessionsChanged).toBe(2);
    expect(summary.volumeDeltaSets).toBe(-6);
    expect(summary.label).toContain("2 sessions changed");
    expect(summary.label).toContain("−6 sets");
    expect(summary.label).toContain("1 session intensity reduced");
  });

  it("handles an empty diff (no-op proposal)", () => {
    const summary = summarizeAdaptationMagnitude([]);
    expect(summary.sessionsChanged).toBe(0);
    expect(summary.volumeDeltaSets).toBe(0);
  });
});

describe("sessionMagnitudeLabel", () => {
  it("labels an add_rest change without numeric deltas", () => {
    const diff: AdaptationSessionDiff = {
      session_id: "s1",
      session_title: "Rest Added",
      scheduled_date: null,
      change: "add_rest",
      load_pct_delta: null,
      volume_delta_sets: null,
      notes: "",
      item_changes: [],
    };
    expect(sessionMagnitudeLabel(diff)).toBe("+ rest day");
  });
});

// ---------------------------------------------------------------------------
// triggerReasonCopy
// ---------------------------------------------------------------------------

describe("triggerReasonCopy", () => {
  it("renders the high_acwr threshold sentence", () => {
    expect(triggerReasonCopy("high_acwr", { acwr: 1.62 })).toContain("1.62");
  });
  it("falls back gracefully for an unrecognized trigger", () => {
    expect(triggerReasonCopy("unknown_trigger", {})).toMatch(/training-load/);
  });
});

// ---------------------------------------------------------------------------
// computeManualRevisionDiff (design spec §9)
// ---------------------------------------------------------------------------

describe("computeManualRevisionDiff", () => {
  it("omits sessions with no detectable difference", () => {
    const before = [session()];
    const after = [session()];
    expect(computeManualRevisionDiff(before, after)).toEqual([]);
  });

  it("produces one red/green row pair for a changed item, not one per field", () => {
    const before = [session({ items: [item({ sets: 5, load_pct_1rm: 75 })] })];
    const after = [session({ items: [item({ sets: 3, load_pct_1rm: 65 })] })];
    const diff = computeManualRevisionDiff(before, after);
    expect(diff).toHaveLength(1);
    expect(diff[0]?.item_changes).toHaveLength(1);
    const ic = diff[0]?.item_changes?.[0];
    expect(ic?.changed).toBe(true);
    expect(ic?.old_sets).toBe(5);
    expect(ic?.new_sets).toBe(3);
    expect(ic?.old_load_pct_1rm).toBe(75);
    expect(ic?.new_load_pct_1rm).toBe(65);
  });

  it("marks a session skipped between snapshots as a skip change", () => {
    const before = [session({ status: "prescribed" })];
    const after = [session({ status: "skipped" })];
    const diff = computeManualRevisionDiff(before, after);
    expect(diff).toHaveLength(1);
    expect(diff[0]?.change).toBe("skip");
  });

  it("marks a dropped item as removed", () => {
    const before = [
      session({
        items: [
          item({ id: "a", movement_name: "Back Squat" }),
          item({ id: "b", movement_name: "Front Squat", item_order: 1 }),
        ],
      }),
    ];
    const after = [
      session({ items: [item({ id: "a", movement_name: "Back Squat" })] }),
    ];
    const diff = computeManualRevisionDiff(before, after);
    expect(diff).toHaveLength(1);
    const removedRow = diff[0]?.item_changes?.find((ic) => ic.removed);
    expect(removedRow).toBeDefined();
    expect(removedRow?.movement_name).toBe("Front Squat");
  });

  it("marks a newly added item with null old_* fields", () => {
    const before = [session({ items: [item({ id: "a" })] })];
    const after = [
      session({
        items: [
          item({ id: "a" }),
          item({ id: "b", movement_name: "Front Squat", item_order: 1 }),
        ],
      }),
    ];
    const diff = computeManualRevisionDiff(before, after);
    const addedRow = diff[0]?.item_changes?.find(
      (ic) => ic.movement_name === "Front Squat",
    );
    expect(addedRow?.old_sets).toBeNull();
    expect(addedRow?.removed).toBe(false);
    expect(addedRow?.changed).toBe(true);
  });

  it("skips sessions that no longer exist in the post-revision snapshot", () => {
    const before = [session({ id: "gone" })];
    const after: PlannedSessionOut[] = [];
    expect(computeManualRevisionDiff(before, after)).toEqual([]);
  });

  it("surfaces a session being un-skipped (restored), not just newly-skipped", () => {
    const before = [session({ status: "skipped" })];
    const after = [session({ status: "prescribed" })];
    const diff = computeManualRevisionDiff(before, after);
    expect(diff).toHaveLength(1);
    expect(diff[0]?.change).not.toBe("skip");
  });

  it("surfaces a pure reschedule (same items/title/notes, different date)", () => {
    const before = [session({ scheduled_date: "2026-07-20" })];
    const after = [session({ scheduled_date: "2026-07-22" })];
    const diff = computeManualRevisionDiff(before, after);
    expect(diff).toHaveLength(1);
    expect(diff[0]?.scheduled_date).toBe("2026-07-22");
  });

  it("surfaces a session the revision newly inserted (present only in the new snapshot)", () => {
    const before = [session({ id: "s1" })];
    const after = [
      session({ id: "s1" }),
      session({
        id: "s2",
        title: "New Accessory Day",
        items: [item({ id: "x", movement_name: "Face Pull" })],
      }),
    ];
    const diff = computeManualRevisionDiff(before, after);
    expect(diff).toHaveLength(1);
    expect(diff[0]?.session_id).toBe("s2");
    expect(
      diff[0]?.item_changes?.every((ic) => ic.old_sets === null && !ic.removed),
    ).toBe(true);
  });

  it("labels a reps-only change (sets unchanged) as reduce_volume, not swap_session", () => {
    const before = [session({ items: [item({ sets: 5, reps: "5" })] })];
    const after = [session({ items: [item({ sets: 5, reps: "3" })] })];
    const diff = computeManualRevisionDiff(before, after);
    expect(diff).toHaveLength(1);
    expect(diff[0]?.change).toBe("reduce_volume");
  });
});

// ---------------------------------------------------------------------------
// isAdaptationDiffStale (design spec §8.7)
// ---------------------------------------------------------------------------

describe("isAdaptationDiffStale", () => {
  const diff: AdaptationSessionDiff = {
    session_id: "session-1",
    session_title: "Heavy Squat Day",
    scheduled_date: null,
    change: "reduce_intensity",
    load_pct_delta: -10,
    volume_delta_sets: null,
    notes: "",
    item_changes: [
      {
        item_id: "item-1",
        movement_name: "Back Squat",
        item_order: 0,
        old_sets: 5,
        old_reps: "5",
        old_load_pct_1rm: 75,
        old_load_kg: 102,
        old_notes: null,
        new_sets: 5,
        new_reps: "5",
        new_load_pct_1rm: 60,
        new_load_kg: 82,
        new_notes: null,
        changed: true,
        removed: false,
      },
    ],
  };

  it("is not stale when live session state matches the diff's recorded old values", () => {
    const live = [session()];
    expect(isAdaptationDiffStale([diff], live)).toBe(false);
  });

  it("is stale when a concurrent manual revision changed the live item", () => {
    const live = [session({ items: [item({ sets: 3 })] })]; // sets no longer 5
    expect(isAdaptationDiffStale([diff], live)).toBe(true);
  });

  it("is stale when the referenced session no longer exists", () => {
    expect(isAdaptationDiffStale([diff], [])).toBe(true);
  });

  it("skip changes are never considered stale (nothing structural to compare)", () => {
    const skipDiff: AdaptationSessionDiff = { ...diff, change: "skip" };
    expect(isAdaptationDiffStale([skipDiff], [])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// sessionsChangedBetweenDiffs (design spec §8.4 selective invalidation)
// ---------------------------------------------------------------------------

describe("sessionsChangedBetweenDiffs", () => {
  it("only flags sessions whose diff actually differs after an adjust round-trip", () => {
    const prior: AdaptationSessionDiff[] = [
      {
        session_id: "s1",
        session_title: "A",
        scheduled_date: null,
        change: "reduce_intensity",
        load_pct_delta: -10,
        volume_delta_sets: null,
        notes: "",
        item_changes: [],
      },
      {
        session_id: "s2",
        session_title: "B",
        scheduled_date: null,
        change: "reduce_volume",
        load_pct_delta: null,
        volume_delta_sets: -2,
        notes: "",
        item_changes: [],
      },
    ];
    const revised: AdaptationSessionDiff[] = [
      {
        session_id: "s1",
        session_title: "A",
        scheduled_date: null,
        change: "reduce_intensity",
        load_pct_delta: -15,
        volume_delta_sets: null,
        notes: "",
        item_changes: [],
      }, // changed
      {
        session_id: "s2",
        session_title: "B",
        scheduled_date: null,
        change: "reduce_volume",
        load_pct_delta: null,
        volume_delta_sets: -2,
        notes: "",
        item_changes: [],
      }, // unchanged
    ];
    const changed = sessionsChangedBetweenDiffs(prior, revised);
    expect(changed.has("s1")).toBe(true);
    expect(changed.has("s2")).toBe(false);
  });
});
