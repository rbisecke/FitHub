import { describe, it, expect } from "vitest";
import {
  CARDIO_CONVERSION_TABLE,
  cardioConversion,
  matchRunDistance,
  isRunningMovement,
} from "./cardio-conversion";

describe("cardio-conversion table", () => {
  it("covers all 4 distances incl. the 200m gap fix", () => {
    expect(CARDIO_CONVERSION_TABLE.map((r) => r.run)).toEqual([
      "200m",
      "400m",
      "800m",
      "1mi",
    ]);
  });

  it("maps 200m to the corrected machine equivalents", () => {
    const row = cardioConversion("200m");
    expect(row?.distance).toEqual({
      row: 250,
      ski: 200,
      bikeErg: 600,
      assaultBike: null,
    });
    expect(row?.calories.assaultBike).toEqual({ min: 6, max: 7 });
  });

  it("keeps the Assault/Echo bike distance-null (calories only)", () => {
    for (const row of CARDIO_CONVERSION_TABLE) {
      expect(row.distance.assaultBike).toBeNull();
      expect(row.calories.assaultBike.min).toBeLessThanOrEqual(
        row.calories.assaultBike.max,
      );
    }
  });

  it("maps 1mi to 1609 metres", () => {
    expect(cardioConversion("1mi")?.runMeters).toBe(1609);
  });
});

describe("matchRunDistance", () => {
  it("fires on 200m now that the matcher is extended", () => {
    expect(matchRunDistance("200m Run")).toBe("200m");
    expect(matchRunDistance("Run 200 meters")).toBe("200m");
  });

  it("recognizes the other distances", () => {
    expect(matchRunDistance("400m sprint")).toBe("400m");
    expect(matchRunDistance("800m run")).toBe("800m");
    expect(matchRunDistance("1 mile run")).toBe("1mi");
    expect(matchRunDistance("Mile repeats")).toBe("1mi");
  });

  it("returns null when there is no recognizable distance", () => {
    expect(matchRunDistance("Back Squat")).toBeNull();
    expect(matchRunDistance("Run")).toBeNull(); // keyword but no distance
  });
});

describe("isRunningMovement", () => {
  it("is true for run/sprint keywords and distance tokens", () => {
    expect(isRunningMovement("Run")).toBe(true);
    expect(isRunningMovement("400m")).toBe(true);
    expect(isRunningMovement("Sprint intervals")).toBe(true);
  });
  it("is false for non-running movements", () => {
    expect(isRunningMovement("Deadlift")).toBe(false);
  });
});
