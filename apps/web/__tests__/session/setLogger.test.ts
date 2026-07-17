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
  // S4 — synchronous double-submit guard on "commit set"
  //
  // Mirrors handleCommit's fix: a ref checked and set *before* any state
  // update or the logging call itself, so a second rapid tap fired before
  // the first render commits still can't dispatch a second LOG_SET.
  // ---------------------------------------------------------------------------
  describe("S4 — double-submit guard on commit set", () => {
    it("a rapid second call is dropped while the first is still in flight", async () => {
      const submittingRef = { current: false };
      const onLogCalls: number[] = [];

      async function handleCommit(callId: number) {
        if (submittingRef.current) return;
        submittingRef.current = true;
        try {
          onLogCalls.push(callId);
          await Promise.resolve(); // simulates work between the guard and release
        } finally {
          submittingRef.current = false;
        }
      }

      // Two "taps" fired before either has a chance to release the guard.
      const first = handleCommit(1);
      const second = handleCommit(2);
      await Promise.all([first, second]);

      expect(onLogCalls).toEqual([1]);
    });

    it("allows a new commit once the previous one has released the guard", async () => {
      const submittingRef = { current: false };
      const onLogCalls: number[] = [];

      async function handleCommit(callId: number) {
        if (submittingRef.current) return;
        submittingRef.current = true;
        try {
          onLogCalls.push(callId);
          await Promise.resolve();
        } finally {
          submittingRef.current = false;
        }
      }

      await handleCommit(1);
      await handleCommit(2);

      expect(onLogCalls).toEqual([1, 2]);
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
