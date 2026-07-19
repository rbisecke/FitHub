import { describe, it, expect } from "vitest";
import {
  linearScale,
  bandScale,
  timeScale,
  linePath,
  arcPath,
  fractionToAngle,
} from "@/lib/charts";

describe("linearScale", () => {
  it("maps domain endpoints to range endpoints", () => {
    const s = linearScale([0, 100], [0, 200]);
    expect(s(0)).toBe(0);
    expect(s(50)).toBe(100);
    expect(s(100)).toBe(200);
  });

  it("exposes ticks within the domain", () => {
    const s = linearScale([0, 10], [0, 100]);
    const ticks = s.ticks(5);
    expect(ticks.length).toBeGreaterThan(0);
    expect(Math.min(...ticks)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ticks)).toBeLessThanOrEqual(10);
  });
});

describe("bandScale", () => {
  it("places each category and reports a bandwidth", () => {
    const s = bandScale(["a", "b", "c"], [0, 300], 0);
    expect(s.scale("a")).toBe(0);
    expect(s.bandwidth()).toBeCloseTo(100, 5);
    expect(s.scale("z")).toBe(0); // unknown key falls back to 0
  });
});

describe("timeScale", () => {
  it("maps the start date to the range start", () => {
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 0, 31);
    const s = timeScale([start, end], [0, 300]);
    expect(s.scale(start)).toBeCloseTo(0, 5);
    expect(s.scale(end)).toBeCloseTo(300, 5);
  });
});

describe("linePath", () => {
  it("produces an SVG path string through the points", () => {
    const d = linePath([
      { x: 0, y: 0 },
      { x: 10, y: 20 },
      { x: 20, y: 5 },
    ]);
    expect(d.startsWith("M")).toBe(true);
    expect(d).toContain("10,20");
  });

  it("returns empty string for no points", () => {
    expect(linePath([])).toBe("");
  });
});

describe("arcPath", () => {
  it("produces a non-empty path for a valid arc", () => {
    const d = arcPath({
      innerRadius: 40,
      outerRadius: 50,
      startAngle: 0,
      endAngle: Math.PI,
    });
    expect(d.startsWith("M")).toBe(true);
  });
});

describe("fractionToAngle", () => {
  it("maps 0 and 1 to the sweep endpoints and clamps out-of-range", () => {
    expect(fractionToAngle(0, 0, Math.PI)).toBe(0);
    expect(fractionToAngle(1, 0, Math.PI)).toBeCloseTo(Math.PI, 5);
    expect(fractionToAngle(0.5, 0, Math.PI)).toBeCloseTo(Math.PI / 2, 5);
    expect(fractionToAngle(2, 0, Math.PI)).toBeCloseTo(Math.PI, 5); // clamped
    expect(fractionToAngle(-1, 0, Math.PI)).toBe(0); // clamped
  });
});
