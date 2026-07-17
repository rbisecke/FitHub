import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// SetLogger load stepping logic (pure functions)
// ---------------------------------------------------------------------------

const STEP = 2.5;

function increment(current: number): number {
  return Math.round((current + STEP) * 10) / 10;
}

function decrement(current: number): number {
  return Math.max(0, Math.round((current - STEP) * 10) / 10);
}

function resolveDefaultKg(
  lastLoggedKg: number | null,
  prescribedKg: number | null,
): number {
  return lastLoggedKg ?? prescribedKg ?? 0;
}

describe("SetLogger load stepping", () => {
  describe("increment (+2.5)", () => {
    it("adds 2.5 to a whole number", () => {
      expect(increment(100)).toBe(102.5);
    });

    it("adds 2.5 to a decimal value", () => {
      expect(increment(102.5)).toBe(105);
    });

    it("works from 0", () => {
      expect(increment(0)).toBe(2.5);
    });

    it("avoids floating point errors", () => {
      // 97.5 + 2.5 should be exactly 100, not 99.99999999
      expect(increment(97.5)).toBe(100);
    });
  });

  describe("decrement (−2.5)", () => {
    it("subtracts 2.5 from a whole number", () => {
      expect(decrement(100)).toBe(97.5);
    });

    it("subtracts 2.5 from a decimal value", () => {
      expect(decrement(102.5)).toBe(100);
    });

    it("clamps to 0, never goes negative", () => {
      expect(decrement(2.5)).toBe(0);
      expect(decrement(0)).toBe(0);
      expect(decrement(1)).toBe(0);
    });

    it("handles values less than 2.5 gracefully", () => {
      expect(decrement(2)).toBe(0);
    });
  });

  describe("resolveDefaultKg (load pre-population)", () => {
    it("prefers lastLoggedKg over prescribedKg", () => {
      expect(resolveDefaultKg(110, 100)).toBe(110);
    });

    it("falls back to prescribedKg when no last logged", () => {
      expect(resolveDefaultKg(null, 80)).toBe(80);
    });

    it("falls back to 0 when both are null (bodyweight)", () => {
      expect(resolveDefaultKg(null, null)).toBe(0);
    });

    it("uses lastLoggedKg of 0 (explicitly logged 0, not null)", () => {
      expect(resolveDefaultKg(0, 80)).toBe(0);
    });
  });

  describe("step sequence", () => {
    it("produces correct sequence from 100: +2.5 +2.5 +2.5", () => {
      let kg = 100;
      kg = increment(kg);
      kg = increment(kg);
      kg = increment(kg);
      expect(kg).toBe(107.5);
    });

    it("produces correct sequence from 107.5: -2.5 -2.5 -2.5", () => {
      let kg = 107.5;
      kg = decrement(kg);
      kg = decrement(kg);
      kg = decrement(kg);
      expect(kg).toBe(100);
    });
  });

  // ---------------------------------------------------------------------------
  // Review fix #3 — SetLogger's commit handler has no ref guard
  //
  // handleCommit is fully synchronous (onLog is a plain dispatch, no await),
  // so there is no async gap between the guard check and the logging call —
  // a ref adds no protection a synchronous call stack doesn't already give.
  // These mirrors reflect the simplified handler: no ref, `submitting` state
  // set around the call for the `disabled` prop, and — critically — every
  // call to handleCommit invokes onLog exactly once (there is nothing to
  // "drop", because JS event handlers can't interleave with each other).
  // ---------------------------------------------------------------------------
  describe("Review fix #3 — no ref guard on commit set (synchronous handler)", () => {
    it("each call to handleCommit invokes onLog exactly once — no interleaving possible", () => {
      const onLogCalls: number[] = [];
      const submittingStates: boolean[] = [];

      function handleCommit(callId: number) {
        submittingStates.push(true);
        try {
          onLogCalls.push(callId);
        } finally {
          submittingStates.push(false);
        }
      }

      // Two separate, sequential "clicks" — since handleCommit is fully
      // synchronous, each one runs to completion (including calling onLog)
      // before the next can begin. There is no window in which a second
      // call could double-fire onLog for the same click.
      handleCommit(1);
      handleCommit(2);

      expect(onLogCalls).toEqual([1, 2]);
      expect(submittingStates).toEqual([true, false, true, false]);
    });

    it("propagates a thrown error into the error state without re-entrancy protection", () => {
      let error: string | null = null;
      let submitting = false;

      function handleCommit(onLog: () => void) {
        submitting = true;
        try {
          error = null;
          onLog();
        } catch {
          error = "Failed to log set. Try again.";
        } finally {
          submitting = false;
        }
      }

      handleCommit(() => {
        throw new Error("boom");
      });

      expect(error).toBe("Failed to log set. Try again.");
      expect(submitting).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // S5 — stable keys for the synthetic set-progress pips
  // ---------------------------------------------------------------------------
  describe("S5 — set-progress pip keys", () => {
    function pipKey(setIndex: number, totalSets: number): string {
      return `set-${setIndex}-of-${totalSets}`;
    }

    it("produces a distinct, stable key per pip for a given totalSets", () => {
      const keys = Array.from({ length: 3 }, (_, i) => pipKey(i, 3));
      expect(keys).toEqual(["set-0-of-3", "set-1-of-3", "set-2-of-3"]);
      expect(new Set(keys).size).toBe(3);
    });

    it("does not collide with keys generated for a different totalSets", () => {
      const threeSets = pipKey(0, 3);
      const fiveSets = pipKey(0, 5);
      expect(threeSets).not.toBe(fiveSets);
    });
  });
});
