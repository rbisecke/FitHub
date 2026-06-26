import { describe, it, expect } from "vitest";
import { fmtDistance, fmtPace } from "@/lib/distance";

describe("fmtDistance", () => {
  it('formats 2000m as "2.00 km" in km mode', () => {
    expect(fmtDistance(2000, "km")).toBe("2.00 km");
  });

  it('formats 2000m as "1.24 mi" in mi mode', () => {
    // 2000 / 1609.344 = 1.2427...
    expect(fmtDistance(2000, "mi")).toBe("1.24 mi");
  });

  it("formats 5000m as 5.00 km", () => {
    expect(fmtDistance(5000, "km")).toBe("5.00 km");
  });

  it("formats 1609.344m as exactly 1.00 mi", () => {
    expect(fmtDistance(1609.344, "mi")).toBe("1.00 mi");
  });

  it("formats 1000m as 0.62 mi", () => {
    // 1000 / 1609.344 = 0.6213...
    expect(fmtDistance(1000, "mi")).toBe("0.62 mi");
  });

  it("formats 400m as 0.40 km", () => {
    expect(fmtDistance(400, "km")).toBe("0.40 km");
  });
});

describe("fmtPace", () => {
  // 2000m in 7:12 (432s) → pace per km = 432 / (2000/1000) = 432/2 = 216s = 3:36 /km
  it('formats 2000m in 7:12 as "3:36 /km" in km mode', () => {
    expect(fmtPace(7 * 60 + 12, 2000, "km")).toBe("3:36 /km");
  });

  // 2000m in 7:12 (432s) → pace per mile = 432 / (2000/1609.344) = 432 / 1.2427 ≈ 347.7s ≈ 5:48 /mi
  it('formats 2000m in 7:12 as "5:48 /mi" in mi mode', () => {
    expect(fmtPace(7 * 60 + 12, 2000, "mi")).toBe("5:48 /mi");
  });

  // 1000m in 5:00 (300s) → pace per km = 300 / (1000/1000) = 300s = 5:00 /km
  it('formats 1000m in 5:00 as "5:00 /km"', () => {
    expect(fmtPace(300, 1000, "km")).toBe("5:00 /km");
  });

  // 1609.344m (1 mile) in 6:00 (360s) → pace per mile = 360 / 1 = 360s = 6:00 /mi
  it('formats 1 mile in 6:00 as "6:00 /mi"', () => {
    expect(fmtPace(360, 1609.344, "mi")).toBe("6:00 /mi");
  });

  it("pads seconds with leading zero", () => {
    // 1000m in 5:05 (305s) → 305s per km → 5:05 /km
    expect(fmtPace(305, 1000, "km")).toBe("5:05 /km");
  });
});
