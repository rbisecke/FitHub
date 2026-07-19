import { describe, it, expect } from "vitest";
import {
  hooperIndex,
  hooperBand,
  dimensionBand,
} from "../components/wellness/hooperIndex";

describe("hooperIndex", () => {
  it("sums the four dimensions", () => {
    expect(hooperIndex(1, 1, 1, 1)).toBe(4);
    expect(hooperIndex(7, 7, 7, 7)).toBe(28);
    expect(hooperIndex(6, 3, 4, 2)).toBe(15);
  });
});

describe("hooperBand", () => {
  it("bands <=12 as ready (green)", () => {
    expect(hooperBand(4)).toEqual({
      band: "ready",
      label: "Ready to train",
      token: "green",
    });
    expect(hooperBand(12)).toEqual({
      band: "ready",
      label: "Ready to train",
      token: "green",
    });
  });

  it("bands 13-18 as moderate (amber)", () => {
    expect(hooperBand(13)).toEqual({
      band: "moderate",
      label: "Moderate readiness",
      token: "amber",
    });
    expect(hooperBand(18)).toEqual({
      band: "moderate",
      label: "Moderate readiness",
      token: "amber",
    });
  });

  it("bands >18 as recover (red)", () => {
    expect(hooperBand(19)).toEqual({
      band: "recover",
      label: "Recover first",
      token: "red",
    });
    expect(hooperBand(28)).toEqual({
      band: "recover",
      label: "Recover first",
      token: "red",
    });
  });
});

describe("dimensionBand", () => {
  it("bands stress/fatigue/soreness directly (low value = green)", () => {
    expect(dimensionBand("stress", 1)).toBe("green");
    expect(dimensionBand("stress", 2)).toBe("green");
    expect(dimensionBand("fatigue", 3)).toBe("amber");
    expect(dimensionBand("fatigue", 5)).toBe("amber");
    expect(dimensionBand("soreness", 6)).toBe("red");
    expect(dimensionBand("soreness", 7)).toBe("red");
  });

  it("inverts sleep (high value = green, because higher sleep is better)", () => {
    expect(dimensionBand("sleep", 7)).toBe("green");
    expect(dimensionBand("sleep", 6)).toBe("green");
    expect(dimensionBand("sleep", 4)).toBe("amber");
    expect(dimensionBand("sleep", 3)).toBe("amber");
    expect(dimensionBand("sleep", 1)).toBe("red");
    expect(dimensionBand("sleep", 2)).toBe("red");
  });
});
