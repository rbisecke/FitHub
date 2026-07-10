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
});
