import { describe, it, expect } from "vitest";
import {
  readinessVerdict,
  readinessArcStyle,
  highLoadTone,
  highLoadToneCopy,
  acwrZone,
  acwrZoneLabel,
  computeAcwrSubScore,
  computeTsbSubScore,
  computeSleepSubScore,
  dominantFactorSentence,
  strainBand,
  strainCopy,
  inferHasTrainingData,
  DOMINANT_FACTOR_THRESHOLD,
} from "@/lib/analytics/readiness-copy";
import type { ReadinessResponse } from "@/lib/api";

function makeReadiness(
  overrides: Partial<ReadinessResponse> = {},
): ReadinessResponse {
  return {
    score: 0.6,
    label: "fresh",
    acwr: null,
    tsb: 0,
    sleep_avg: null,
    factors_available: 0,
    recovery_score: null,
    coverage: null,
    confidence_tier: null,
    hrv_type: null,
    strain_score: null,
    ...overrides,
  };
}

describe("readinessVerdict", () => {
  it("never returns the raw enum token", () => {
    expect(readinessVerdict("optimal")).toBe("Go hard today");
    expect(readinessVerdict("fresh")).toBe("Good to train");
    expect(readinessVerdict("high_load")).toBe(
      "Ease off, you're carrying load",
    );
    expect(readinessVerdict("fatigued")).toBe("Recover today");
    expect(readinessVerdict("insufficient_data")).toBe("Not enough data yet");
  });
});

describe("readinessArcStyle", () => {
  it("gives insufficient_data a dashed-outline, non-filled treatment", () => {
    const style = readinessArcStyle("insufficient_data");
    expect(style.treatment).toBe("dashed-outline");
    expect(style.colorVar).toBe("--muted");
  });

  it("gives every other label a filled treatment with its own color", () => {
    expect(readinessArcStyle("optimal")).toEqual({
      colorVar: "--green",
      treatment: "filled",
    });
    expect(readinessArcStyle("fresh").colorVar).toBe("--accent");
    expect(readinessArcStyle("high_load").colorVar).toBe("--amber");
    expect(readinessArcStyle("fatigued").colorVar).toBe("--red");
  });
});

describe("highLoadTone", () => {
  it("is moderate at and above the 0.55 band", () => {
    expect(highLoadTone(0.55)).toBe("moderate");
    expect(highLoadTone(0.7)).toBe("moderate");
  });
  it("is severe below 0.35", () => {
    expect(highLoadTone(0.34)).toBe("severe");
    expect(highLoadTone(0.0)).toBe("severe");
  });
  it("copy differs between the two bands", () => {
    expect(highLoadToneCopy("moderate")).not.toBe(highLoadToneCopy("severe"));
  });
});

describe("acwrZone / acwrZoneLabel", () => {
  it("matches the backend's _acwr_zone bands", () => {
    expect(acwrZone(null)).toBe("insufficient_data");
    expect(acwrZone(0.5)).toBe("undertraining");
    expect(acwrZone(1.0)).toBe("sweet_spot");
    expect(acwrZone(1.4)).toBe("caution");
    expect(acwrZone(1.6)).toBe("overreaching");
  });
  it("labels every zone with a non-empty string", () => {
    expect(acwrZoneLabel("sweet_spot").length).toBeGreaterThan(0);
  });
});

describe("sub-score computations mirror _score_readiness", () => {
  it("acwr sub-score bands", () => {
    expect(computeAcwrSubScore(1.0, true)).toBe(0.8);
    expect(computeAcwrSubScore(0.5, true)).toBe(0.5);
    expect(computeAcwrSubScore(1.4, true)).toBe(0.4);
    expect(computeAcwrSubScore(1.6, true)).toBe(0.2);
    expect(computeAcwrSubScore(null, true)).toBeNull();
    expect(computeAcwrSubScore(1.0, false)).toBeNull();
  });

  it("tsb sub-score is clamped", () => {
    expect(computeTsbSubScore(20, true)).toBe(1);
    expect(computeTsbSubScore(-20, true)).toBe(0);
    expect(computeTsbSubScore(0, true)).toBe(0.5);
    expect(computeTsbSubScore(0, false)).toBeNull();
  });

  it("sleep sub-score is NOT clamped", () => {
    expect(computeSleepSubScore(7)).toBe(1);
    expect(computeSleepSubScore(1)).toBe(0);
    expect(computeSleepSubScore(null)).toBeNull();
  });
});

describe("dominantFactorSentence", () => {
  it("shows a neutral message when no sub-scores are present", () => {
    expect(
      dominantFactorSentence({
        acwrSubScore: null,
        acwr: null,
        tsbSubScore: null,
        tsb: 0,
        sleepSubScore: null,
        sleepAvg: null,
      }),
    ).toBe("No single factor stands out today.");
  });

  it("shows a neutral message when every candidate is under the threshold", () => {
    // tsb sub-score of 0.5 + DOMINANT_FACTOR_THRESHOLD/2 deviation is below gate
    const tsbForSmallDeviation =
      (0.5 + DOMINANT_FACTOR_THRESHOLD / 2) * 40 - 20;
    const result = dominantFactorSentence({
      acwrSubScore: null,
      acwr: null,
      tsbSubScore: 0.5 + DOMINANT_FACTOR_THRESHOLD / 2,
      tsb: tsbForSmallDeviation,
      sleepSubScore: null,
      sleepAvg: null,
    });
    expect(result).toBe("No single factor stands out today.");
  });

  it("picks the furthest-from-neutral candidate above threshold", () => {
    const result = dominantFactorSentence({
      acwrSubScore: 0.2, // deviation -0.3, largest
      acwr: 1.6,
      tsbSubScore: 0.45, // deviation -0.05
      tsb: -2,
      sleepSubScore: null,
      sleepAvg: null,
    });
    expect(result).toContain("ACWR");
  });
});

describe("inferHasTrainingData", () => {
  it("is true whenever acwr is non-null (definitive)", () => {
    expect(inferHasTrainingData(makeReadiness({ acwr: 1.1 }))).toBe(true);
  });

  it("is true when acwr and sleep_avg are both null but a factor is available", () => {
    // factors_available can't have come from sleep here, so it must be tsb.
    expect(
      inferHasTrainingData(
        makeReadiness({ acwr: null, sleep_avg: null, factors_available: 1 }),
      ),
    ).toBe(true);
  });

  it("is false when acwr, sleep_avg, and factors_available are all absent", () => {
    expect(
      inferHasTrainingData(
        makeReadiness({ acwr: null, sleep_avg: null, factors_available: 0 }),
      ),
    ).toBe(false);
  });

  it("falls back to tsb !== 0 when sleep_avg is present (ambiguous case)", () => {
    expect(
      inferHasTrainingData(
        makeReadiness({
          acwr: null,
          sleep_avg: 5,
          tsb: 4,
          factors_available: 2,
        }),
      ),
    ).toBe(true);
    expect(
      inferHasTrainingData(
        makeReadiness({
          acwr: null,
          sleep_avg: 5,
          tsb: 0,
          factors_available: 1,
        }),
      ),
    ).toBe(false);
  });
});

describe("strainCopy / strainBand", () => {
  it("bands the exact-template copy", () => {
    expect(strainBand(100)).toBe("typical");
    expect(strainBand(60)).toBe("typical"); // below-baseline still typical
    expect(strainBand(135)).toBe("above");
    expect(strainBand(180)).toBe("well_above");
  });
  it("renders the exact 'Strain {n} — ...' template", () => {
    expect(strainCopy(100)).toBe("Strain 100 — typical for you");
    expect(strainCopy(135)).toBe("Strain 135 — above typical for you");
    expect(strainCopy(180)).toBe("Strain 180 — well above typical for you");
  });
});
