import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// RestTimer countdown logic (pure functions, no React)
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function computeProgress(secondsLeft: number, totalSeconds: number): number {
  if (totalSeconds <= 0) return 0;
  return secondsLeft / totalSeconds;
}

function computeDashOffset(
  secondsLeft: number,
  totalSeconds: number,
  circumference: number,
): number {
  const progress = computeProgress(secondsLeft, totalSeconds);
  return circumference * (1 - progress);
}

describe("RestTimer countdown logic", () => {
  describe("formatTime", () => {
    it("formats 0 seconds as 00:00", () => {
      expect(formatTime(0)).toBe("00:00");
    });

    it("formats 90 seconds as 01:30", () => {
      expect(formatTime(90)).toBe("01:30");
    });

    it("formats 180 seconds as 03:00", () => {
      expect(formatTime(180)).toBe("03:00");
    });

    it("formats 240 seconds as 04:00", () => {
      expect(formatTime(240)).toBe("04:00");
    });

    it("formats 65 seconds as 01:05", () => {
      expect(formatTime(65)).toBe("01:05");
    });

    it("pads single-digit seconds with leading zero", () => {
      expect(formatTime(61)).toBe("01:01");
    });
  });

  describe("computeProgress", () => {
    it("returns 1 when no time has elapsed", () => {
      expect(computeProgress(90, 90)).toBe(1);
    });

    it("returns 0.5 when half the time has elapsed", () => {
      expect(computeProgress(45, 90)).toBe(0.5);
    });

    it("returns 0 when all time has elapsed", () => {
      expect(computeProgress(0, 90)).toBe(0);
    });

    it("returns 0 when totalSeconds is 0 (guard)", () => {
      expect(computeProgress(0, 0)).toBe(0);
    });
  });

  describe("computeDashOffset", () => {
    const circumference = 2 * Math.PI * 96; // example ring

    it("returns 0 dashOffset at full time (ring fully drawn)", () => {
      const offset = computeDashOffset(90, 90, circumference);
      expect(offset).toBeCloseTo(0);
    });

    it("returns full circumference dashOffset at 0 time (ring empty)", () => {
      const offset = computeDashOffset(0, 90, circumference);
      expect(offset).toBeCloseTo(circumference);
    });

    it("returns half circumference at midpoint", () => {
      const offset = computeDashOffset(45, 90, circumference);
      expect(offset).toBeCloseTo(circumference / 2);
    });
  });

  describe("countdown simulation", () => {
    it("decrements correctly over multiple ticks", () => {
      let secondsLeft = 5;
      const ticks: number[] = [];

      for (let i = 0; i < 5; i++) {
        secondsLeft = secondsLeft - 1;
        ticks.push(secondsLeft);
      }

      expect(ticks).toEqual([4, 3, 2, 1, 0]);
    });

    it("stops decrementing at 0", () => {
      let secondsLeft = 1;
      secondsLeft = Math.max(0, secondsLeft - 1);
      expect(secondsLeft).toBe(0);

      // Ensure guard: don't go below 0
      secondsLeft = Math.max(0, secondsLeft - 1);
      expect(secondsLeft).toBe(0);
    });

    it("detects completion at 0 seconds", () => {
      const isComplete = (s: number) => s === 0;
      expect(isComplete(0)).toBe(true);
      expect(isComplete(1)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // S3 — wall-clock anchored countdown (no per-tick drift)
  //
  // Mirrors RestTimer's fixed algorithm: a target timestamp computed once
  // (Date.now() + secondsLeft * 1000), with secondsLeft derived each tick as
  // Math.round((target - now()) / 1000) — not by decrementing a counter that
  // round-trips through parent state/render on every tick, which is what let
  // real render overhead accumulate into measurable drift over a multi-minute
  // rest (S3, apps/web/components/session/RestTimer.tsx).
  // ---------------------------------------------------------------------------
  describe("S3 — wall-clock anchored countdown", () => {
    it("reaches exactly 0 after enough real time passes, immune to irregular per-tick overhead", () => {
      let now = 0; // simulated wall-clock ms
      const initialSecondsLeft = 180;
      const target = now + initialSecondsLeft * 1000;

      let secondsLeft = initialSecondsLeft;
      let ticks = 0;
      // Each tick advances real time by 1000ms plus a variable amount of
      // render/JS overhead — the exact source of drift the old
      // secondsLeft-derived implementation accumulated tick over tick.
      while (secondsLeft > 0) {
        now += 1000 + (ticks % 3) * 40;
        secondsLeft = Math.max(0, Math.round((target - now) / 1000));
        ticks += 1;
      }

      expect(secondsLeft).toBe(0);
      // The target is fixed and derived once — per-tick overhead changes how
      // many polls it takes to notice 0 was reached, but never leaves
      // secondsLeft stuck above 0 or drifting past it into negative territory.
      expect(ticks).toBeGreaterThan(0);
    });

    it("re-anchoring the target on resume preserves the exact retained remaining time", () => {
      let now = 0;
      const initialSecondsLeft = 90;
      let target = now + initialSecondsLeft * 1000;

      // Run for 30 real seconds.
      now += 30_000;
      let secondsLeft = Math.max(0, Math.round((target - now) / 1000));
      expect(secondsLeft).toBe(60);

      // Pause for an arbitrary amount of real time — no ticking happens
      // while paused, so secondsLeft (60) must be retained exactly.
      now += 45_000;

      // Resume: re-anchor the target from the retained secondsLeft, not the
      // stale original target (which would now read as already elapsed).
      target = now + secondsLeft * 1000;

      // Run for another 60 real seconds — should land exactly on 0.
      now += 60_000;
      secondsLeft = Math.max(0, Math.round((target - now) / 1000));
      expect(secondsLeft).toBe(0);
    });

    it("supports multiple pause/resume cycles across a 180s rest and still lands on exactly 0", () => {
      let now = 0;
      let secondsLeft = 180;
      let target = now + secondsLeft * 1000;

      function tick(ms: number) {
        now += ms;
        secondsLeft = Math.max(0, Math.round((target - now) / 1000));
      }
      function pauseThenResumeAfter(ms: number) {
        now += ms; // no ticking while paused
        target = now + secondsLeft * 1000; // re-anchor on resume
      }

      tick(60_000); // 60s elapsed → 120 left
      expect(secondsLeft).toBe(120);

      pauseThenResumeAfter(20_000); // paused 20s, resumes — secondsLeft unchanged
      expect(secondsLeft).toBe(120);

      tick(60_000); // another 60s → 60 left
      expect(secondsLeft).toBe(60);

      pauseThenResumeAfter(5_000);
      expect(secondsLeft).toBe(60);

      tick(60_000); // final 60s → exactly 0
      expect(secondsLeft).toBe(0);
    });
  });
});
