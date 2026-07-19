import { describe, it, expect } from "vitest";
import {
  toKg,
  toMeters,
  parseFlexibleTime,
  normalizeTimeInput,
  formatErgPace,
  parseLocalDate,
  localDateKey,
  formatResultValue,
  scaledQualifier,
  DEFAULT_PACE_DISTANCE_M,
  type DisplayUnits,
} from "@/lib/units";
import type { Result } from "@/lib/api";

const KG: DisplayUnits = { weight: "kg", distance: "km" };
const IMPERIAL: DisplayUnits = { weight: "lb", distance: "mi" };

describe("weight conversion (kg↔lb)", () => {
  it("passes kg through unchanged", () => {
    expect(toKg(100, "kg")).toBe(100);
  });

  it("converts lb display value to precise kg (no rounding)", () => {
    // 225 lb → 102.0582... kg, must not be rounded before submit
    expect(toKg(225, "lb")).toBeCloseTo(102.0582, 3);
  });

  it("round-trips a lb value back close to itself", () => {
    const kg = toKg(135, "lb");
    expect(kg * 2.20462).toBeCloseTo(135, 1);
  });
});

describe("distance conversion (km/mi → m)", () => {
  it("converts km to metres", () => {
    expect(toMeters(2, "km")).toBe(2000);
  });

  it("converts miles to precise metres", () => {
    expect(toMeters(1, "mi")).toBeCloseTo(1609.344, 3);
  });
});

describe("flexible time parsing", () => {
  it("parses raw seconds under 3 digits", () => {
    expect(parseFlexibleTime("45")).toBe(45);
  });

  it("parses 3+ digits as m:ss (712 → 7:12)", () => {
    expect(parseFlexibleTime("712")).toBe(7 * 60 + 12);
  });

  it("parses explicit colon form", () => {
    expect(parseFlexibleTime("7:12")).toBe(432);
  });

  it("returns null for empty or garbage input", () => {
    expect(parseFlexibleTime("")).toBeNull();
    expect(parseFlexibleTime("abc")).toBeNull();
  });

  it("normalizes to m:ss on blur", () => {
    expect(normalizeTimeInput("712")).toBe("7:12");
    expect(normalizeTimeInput("45")).toBe("0:45");
    expect(normalizeTimeInput("")).toBe("");
  });
});

describe("erg pace formatting", () => {
  it("defaults to /500m", () => {
    expect(formatErgPace(112)).toBe(`1:52 /${DEFAULT_PACE_DISTANCE_M}m`);
  });

  it("respects a custom pace distance", () => {
    expect(formatErgPace(120, 1000)).toBe("2:00 /1000m");
  });
});

describe("local-date-parts handling", () => {
  it("parses a date-only string at local midnight, not UTC", () => {
    const d = parseLocalDate("2025-03-15");
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(2); // March
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(0);
  });

  it("does not shift the calendar day the way new Date(iso) would", () => {
    // new Date("2025-03-15") is UTC midnight; in negative-offset zones that reads
    // as the 14th. parseLocalDate must always report the 15th regardless of tz.
    expect(parseLocalDate("2025-03-15").getDate()).toBe(15);
  });

  it("builds a local YYYY-MM-DD key from a date-time string", () => {
    expect(localDateKey("2025-03-15T08:30:00")).toBe("2025-03-15");
  });

  it("zero-pads single-digit months and days", () => {
    expect(localDateKey("2025-01-05")).toBe("2025-01-05");
  });

  it("resolves a tz-aware timestamp's true local day, not its UTC day (regression: performed_at is a real timestamptz)", () => {
    const originalTz = process.env.TZ;
    process.env.TZ = "Pacific/Kiritimati"; // UTC+14
    try {
      // 2025-03-15T23:30:00-05:00 is 2025-03-16T04:30:00 UTC, which is
      // 2025-03-16T18:30 local in UTC+14 — the local day is the 16th, even
      // though the string's own date digits (and a naive slice(0, 10)) say 15.
      expect(localDateKey("2025-03-15T23:30:00-05:00")).toBe("2025-03-16");
    } finally {
      process.env.TZ = originalTz;
    }
  });

  it("resolves the local day backward across the UTC boundary too", () => {
    const originalTz = process.env.TZ;
    process.env.TZ = "Etc/GMT+12"; // UTC-12
    try {
      // 2025-03-15T01:00:00+05:00 is 2025-03-14T20:00:00 UTC, which is
      // 2025-03-14T08:00 local in UTC-12 — the local day is the 14th, not the
      // 15th a naive slice(0, 10) of the input string would report.
      expect(localDateKey("2025-03-15T01:00:00+05:00")).toBe("2025-03-14");
    } finally {
      process.env.TZ = originalTz;
    }
  });
});

function makeResult(overrides: Partial<Result>): Result {
  return {
    id: "r1",
    user_id: "u1",
    workout_id: "w1",
    movement_id: "m1",
    result_type: "weight",
    load_kg: null,
    reps: null,
    time_s: null,
    distance_m: null,
    calories: null,
    height_cm: null,
    rounds: null,
    partial_reps: null,
    watts: null,
    pace_s: null,
    pace_distance_m: 500,
    set_index: 0,
    order_index: 0,
    is_pr: false,
    notes: null,
    variant_annotation: null,
    implement: null,
    tempo: null,
    side: null,
    rpe: null,
    rpe_target: null,
    rir: null,
    rest_s: null,
    mean_velocity_ms: null,
    peak_velocity_ms: null,
    estimated_1rm_kg: null,
    scaled: false,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("formatResultValue", () => {
  it("formats weight × reps in kg", () => {
    const r = makeResult({ result_type: "weight", load_kg: "100", reps: 5 });
    expect(formatResultValue(r, KG)).toBe("100.0 kg × 5");
  });

  it("formats weight in lb using the display preference", () => {
    const r = makeResult({ result_type: "weight", load_kg: "100", reps: 5 });
    expect(formatResultValue(r, IMPERIAL)).toBe("220 lb × 5");
  });

  it("formats time as m:ss", () => {
    const r = makeResult({ result_type: "time", time_s: 272 });
    expect(formatResultValue(r, KG)).toBe("4:32");
  });

  it("formats distance in the display unit", () => {
    const r = makeResult({ result_type: "distance", distance_m: "2000" });
    expect(formatResultValue(r, KG)).toBe("2.00 km");
    expect(formatResultValue(r, IMPERIAL)).toBe("1.24 mi");
  });

  it("formats a bare reps result", () => {
    const r = makeResult({ result_type: "reps", reps: 21 });
    expect(formatResultValue(r, KG)).toBe("21 reps");
  });

  it("formats a height result in cm", () => {
    const r = makeResult({ result_type: "height", height_cm: "120" });
    expect(formatResultValue(r, KG)).toBe("120 cm");
  });

  it("formats a watts result", () => {
    const r = makeResult({ result_type: "watts", watts: 250 });
    expect(formatResultValue(r, KG)).toBe("250 W");
  });

  it("formats rounds + partial reps", () => {
    const r = makeResult({
      result_type: "rounds_reps",
      rounds: 3,
      partial_reps: 4,
    });
    expect(formatResultValue(r, KG)).toBe("3 + 4 rounds");
  });

  it("formats bare rounds without a partial", () => {
    const r = makeResult({
      result_type: "rounds_reps",
      rounds: 5,
      partial_reps: 0,
    });
    expect(formatResultValue(r, KG)).toBe("5 rounds");
  });

  it("formats pace with the /500m suffix", () => {
    const r = makeResult({
      result_type: "pace",
      pace_s: 112,
      pace_distance_m: 500,
    });
    expect(formatResultValue(r, KG)).toBe("1:52 /500m");
  });

  it("falls back to an em-dash placeholder when values are absent", () => {
    const r = makeResult({ result_type: "calories", calories: null });
    expect(formatResultValue(r, KG)).toBe("—");
  });
});

describe("scaledQualifier", () => {
  it("returns Scaled only when the result is scaled", () => {
    expect(scaledQualifier(true)).toBe("Scaled");
  });

  it("returns null for an Rx'd (unscaled) result", () => {
    expect(scaledQualifier(false)).toBeNull();
  });
});
