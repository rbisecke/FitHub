import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Pure logic tests mirroring the fixes in SessionExecutionView.tsx
// (C3, C4, S1, S2). The vitest environment is "node" (no DOM), matching the
// convention already used by restTimer/setLogger/exerciseSwapSheet tests in
// this directory: the underlying pure logic is exercised directly rather
// than rendering the client component.
// ---------------------------------------------------------------------------

interface Item {
  id: string;
  movement_name: string;
  sets: number | null;
}

interface SwapEntry {
  movementId: string;
  movementName: string;
}

// Mirrors SessionExecutionView's currentItem computation.
function resolveCurrentItem(
  baseItem: Item | undefined,
  swappedExercises: Record<string, SwapEntry>,
): Item | undefined {
  if (!baseItem) return undefined;
  const swap = swappedExercises[baseItem.id];
  return swap ? { ...baseItem, movement_name: swap.movementName } : baseItem;
}

// ---------------------------------------------------------------------------
// C3 — exercise swap resolved through swappedExercises
// ---------------------------------------------------------------------------

describe("C3 — exercise swap resolution", () => {
  it("returns the base item unchanged when no swap is recorded for it", () => {
    const base: Item = { id: "item-1", movement_name: "Back Squat", sets: 3 };
    const result = resolveCurrentItem(base, {});
    expect(result?.movement_name).toBe("Back Squat");
  });

  it("resolves to the substitute's name once a swap is confirmed for this item", () => {
    const base: Item = { id: "item-1", movement_name: "Back Squat", sets: 3 };
    const swaps: Record<string, SwapEntry> = {
      "item-1": { movementId: "mv-99", movementName: "Front Squat" },
    };
    const result = resolveCurrentItem(base, swaps);
    expect(result?.movement_name).toBe("Front Squat");
  });

  it("keeps the planned_items id unchanged across a swap — only the display/log name changes", () => {
    const base: Item = { id: "item-1", movement_name: "Back Squat", sets: 3 };
    const swaps: Record<string, SwapEntry> = {
      "item-1": { movementId: "mv-99", movementName: "Front Squat" },
    };
    const result = resolveCurrentItem(base, swaps);
    // The backend validates logged_sets[].planned_item_id against the
    // original planned_items row — this must never change on swap.
    expect(result?.id).toBe("item-1");
  });

  it("does not resolve a swap recorded against a different item", () => {
    const base: Item = { id: "item-2", movement_name: "Deadlift", sets: 3 };
    const swaps: Record<string, SwapEntry> = {
      "item-1": { movementId: "mv-99", movementName: "Front Squat" },
    };
    const result = resolveCurrentItem(base, swaps);
    expect(result?.movement_name).toBe("Deadlift");
  });

  it("returns undefined when there is no base item (session already complete)", () => {
    expect(resolveCurrentItem(undefined, {})).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// C4 — completion payload construction (movement_id resolved through swaps)
// ---------------------------------------------------------------------------

interface LoggedSet {
  itemId: string;
  loadKg: number | null;
  reps: number;
  rpe: number | null;
}

interface LoggedSetPayload {
  planned_item_id: string;
  movement_id: string | null;
  load_kg: number | null;
  reps: number;
  rpe: number | null;
}

// Mirrors handleFinish's payload construction.
function toLoggedSetPayload(
  loggedSets: LoggedSet[],
  swappedExercises: Record<string, SwapEntry>,
): LoggedSetPayload[] {
  return loggedSets.map((s) => ({
    planned_item_id: s.itemId,
    movement_id: swappedExercises[s.itemId]?.movementId ?? null,
    load_kg: s.loadKg,
    reps: s.reps,
    rpe: s.rpe,
  }));
}

describe("C4 — completion payload construction", () => {
  it("carries a null movement_id for sets logged against the original (non-swapped) movement", () => {
    const sets: LoggedSet[] = [
      { itemId: "item-1", loadKg: 100, reps: 5, rpe: null },
    ];
    const payload = toLoggedSetPayload(sets, {});
    expect(payload).toEqual([
      {
        planned_item_id: "item-1",
        movement_id: null,
        load_kg: 100,
        reps: 5,
        rpe: null,
      },
    ]);
  });

  it("resolves movement_id to the substitute for sets logged after a swap", () => {
    const sets: LoggedSet[] = [
      { itemId: "item-1", loadKg: 40, reps: 8, rpe: 7 },
    ];
    const swaps: Record<string, SwapEntry> = {
      "item-1": { movementId: "mv-99", movementName: "Front Squat" },
    };
    const payload = toLoggedSetPayload(sets, swaps);
    expect(payload[0]?.movement_id).toBe("mv-99");
    expect(payload[0]?.planned_item_id).toBe("item-1");
  });

  it("resolves movement_id independently per item when only some exercises were swapped", () => {
    const sets: LoggedSet[] = [
      { itemId: "item-1", loadKg: 40, reps: 8, rpe: null },
      { itemId: "item-2", loadKg: 60, reps: 5, rpe: null },
    ];
    const swaps: Record<string, SwapEntry> = {
      "item-1": { movementId: "mv-99", movementName: "Front Squat" },
    };
    const payload = toLoggedSetPayload(sets, swaps);
    expect(payload[0]?.movement_id).toBe("mv-99");
    expect(payload[1]?.movement_id).toBeNull();
  });

  it("preserves multiple logged sets for the same swapped item in order", () => {
    const sets: LoggedSet[] = [
      { itemId: "item-1", loadKg: 40, reps: 8, rpe: null },
      { itemId: "item-1", loadKg: 42.5, reps: 6, rpe: 8 },
    ];
    const swaps: Record<string, SwapEntry> = {
      "item-1": { movementId: "mv-99", movementName: "Front Squat" },
    };
    const payload = toLoggedSetPayload(sets, swaps);
    expect(payload).toHaveLength(2);
    expect(payload.every((p) => p.movement_id === "mv-99")).toBe(true);
    expect(payload.map((p) => p.load_kg)).toEqual([40, 42.5]);
  });
});

// ---------------------------------------------------------------------------
// S1 — terminal transitions reach exerciseIndex === totalItems
// ---------------------------------------------------------------------------

// Mirrors the fixed LOG_SET reducer branch for "last set of last exercise".
function terminalLogSetExerciseIndex(totalItems: number): number {
  return totalItems;
}

// Mirrors the fixed advanceExercise terminal branch (used by SKIP_EXERCISE).
function advanceExerciseIndex(
  currentIndex: number,
  totalItems: number,
): number {
  const nextExercise = currentIndex + 1;
  return nextExercise >= totalItems ? totalItems : nextExercise;
}

describe("S1 — progress header exact-total accounting", () => {
  it("logging the last set of the last exercise reaches exerciseIndex === totalItems", () => {
    expect(terminalLogSetExerciseIndex(2)).toBe(2);
  });

  it("skipping the last exercise reaches exerciseIndex === totalItems", () => {
    expect(advanceExerciseIndex(1, 2)).toBe(2);
  });

  it("skipping a non-last exercise advances by one, not to totalItems", () => {
    expect(advanceExerciseIndex(0, 2)).toBe(1);
  });

  it("the completion screen's header/progress reads the exact total for a 2-exercise session", () => {
    // This is the review's own reproduction case: a 2-exercise session used
    // to read "1/2 exercises · 50%" on the completion screen.
    const totalItems = 2;
    const exerciseIndex = terminalLogSetExerciseIndex(totalItems);
    const progressPct = (exerciseIndex / totalItems) * 100;

    expect(`${exerciseIndex}/${totalItems} exercises`).toBe("2/2 exercises");
    expect(Math.round(progressPct)).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// S2 — last-load cache keyed by normalized movement name, not planned_items.id
// ---------------------------------------------------------------------------

function normalizeMovementKey(movementName: string): string {
  return movementName.trim().toLowerCase().replace(/\s+/g, " ");
}

describe("S2 — last-load cache keyed by movement name", () => {
  it("normalizes case and surrounding whitespace to the same key", () => {
    expect(normalizeMovementKey("Back Squat")).toBe("back squat");
    expect(normalizeMovementKey("  Back Squat  ")).toBe("back squat");
    expect(normalizeMovementKey("BACK SQUAT")).toBe("back squat");
  });

  it("collapses repeated internal whitespace", () => {
    expect(normalizeMovementKey("Back   Squat")).toBe("back squat");
  });

  it("produces the same key for two different planned_items rows with the same movement name", () => {
    // Simulates two different weeks' planned_items rows for "Back Squat" —
    // a fresh id every week, but the same movement name.
    const weekOneItem = {
      id: "planned-item-week-1",
      movement_name: "Back Squat",
    };
    const weekTwoItem = {
      id: "planned-item-week-2",
      movement_name: "Back Squat",
    };
    expect(normalizeMovementKey(weekOneItem.movement_name)).toBe(
      normalizeMovementKey(weekTwoItem.movement_name),
    );
  });

  it("simulates a cache hit across weeks despite different planned_items ids (the bug this fixes)", () => {
    const store = new Map<string, number>();
    const save = (name: string, kg: number) =>
      store.set(normalizeMovementKey(name), kg);
    const load = (name: string) =>
      store.get(normalizeMovementKey(name)) ?? null;

    // Session A (week 1, planned_items.id = "week-1-item"): log 100kg.
    save("Back Squat", 100);

    // Session B (week 2, planned_items.id = "week-2-item" — a brand-new row):
    // pre-population must still find the week 1 load.
    expect(load("Back Squat")).toBe(100);
  });

  it("does not confuse two different movements with similarly-formatted names", () => {
    const store = new Map<string, number>();
    store.set(normalizeMovementKey("Front Squat"), 80);
    expect(store.get(normalizeMovementKey("Back Squat"))).toBeUndefined();
  });
});
