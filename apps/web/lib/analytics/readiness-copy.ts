import type { ReadinessResponse } from "@/lib/api";

/**
 * Pure copy/logic layer for Screen 5 (Readiness) and Screen 6 (Wearable
 * Recovery), per design-spec 04-records-and-analytics.md §Screen 5/6.
 * No React, no fetching — testable in isolation.
 */

export type ReadinessLabel = ReadinessResponse["label"];

/** label -> plain-language verdict (04 §5A, finalized 2026-07-18). Never show the raw enum. */
const VERDICT_COPY: Record<ReadinessLabel, string> = {
  optimal: "Go hard today",
  fresh: "Good to train",
  high_load: "Ease off, you're carrying load",
  fatigued: "Recover today",
  insufficient_data: "Not enough data yet",
};

export function readinessVerdict(label: ReadinessLabel): string {
  return VERDICT_COPY[label];
}

export type ArcTreatment = "filled" | "dashed-outline";

export interface ArcStyle {
  /** CSS custom property name, e.g. "--green". */
  colorVar: string;
  treatment: ArcTreatment;
}

/** label -> arc color + treatment (04 §5A "Visual treatment" table). One color at a time. */
const ARC_STYLE: Record<ReadinessLabel, ArcStyle> = {
  optimal: { colorVar: "--green", treatment: "filled" },
  fresh: { colorVar: "--accent", treatment: "filled" },
  high_load: { colorVar: "--amber", treatment: "filled" },
  fatigued: { colorVar: "--red", treatment: "filled" },
  // Distinct no-data treatment: a hardcoded 0.5 must never look like a real 50%.
  insufficient_data: { colorVar: "--muted", treatment: "dashed-outline" },
};

export function readinessArcStyle(label: ReadinessLabel): ArcStyle {
  return ARC_STYLE[label];
}

/**
 * The `high_load` asymmetry (04 §5B, finalized 2026-07-18): both the
 * >=0.55-with-tsb<=0 band and the <0.35 band resolve to the same `high_load`
 * enum. The backend's `_score_readiness` (apps/api/app/repositories/analytics.py)
 * only ever assigns `high_load` in those two disjoint score ranges — a score
 * in [0.35, 0.55) is always `fatigued` instead — so `score >= 0.55` reliably
 * identifies the moderate band without re-deriving the tsb<=0 condition.
 */
export function highLoadTone(score: number): "moderate" | "severe" {
  return score >= 0.55 ? "moderate" : "severe";
}

export function highLoadToneCopy(tone: "moderate" | "severe"): string {
  return tone === "moderate"
    ? "Carrying load — a manageable day, still training normally."
    : "Deeply fatigued — a stronger recovery-first signal today.";
}

/** ACWR zone bands, mirrored from `_acwr_zone` in apps/api/app/routers/analytics.py. */
export type AcwrZone =
  | "insufficient_data"
  | "undertraining"
  | "sweet_spot"
  | "caution"
  | "overreaching";

export function acwrZone(acwr: number | null): AcwrZone {
  if (acwr === null) return "insufficient_data";
  if (acwr < 0.8) return "undertraining";
  if (acwr <= 1.3) return "sweet_spot";
  if (acwr <= 1.5) return "caution";
  return "overreaching";
}

const ACWR_ZONE_LABEL: Record<AcwrZone, string> = {
  insufficient_data: "not enough history",
  undertraining: "undertraining",
  sweet_spot: "sweet spot",
  caution: "caution",
  overreaching: "overreaching",
};

export function acwrZoneLabel(zone: AcwrZone): string {
  return ACWR_ZONE_LABEL[zone];
}

/**
 * Sub-scores (04 §5B): the composite is the unweighted mean of whichever of
 * these are present. Mirrors `_score_readiness` exactly so the client-side
 * breakdown reflects the same math the server used to build `score`.
 */
export interface SubScore {
  key: "acwr" | "tsb" | "sleep";
  /** 0-1 sub-score value, present only when the underlying signal exists. */
  value: number | null;
  /** Raw underlying metric, for display alongside the sub-score. */
  raw: number | null;
}

export function computeAcwrSubScore(
  acwr: number | null,
  hasTrainingData: boolean,
): number | null {
  if (acwr === null || !hasTrainingData) return null;
  if (acwr >= 0.8 && acwr <= 1.3) return 0.8;
  if (acwr < 0.8) return 0.5;
  if (acwr <= 1.5) return 0.4;
  return 0.2;
}

export function computeTsbSubScore(
  tsb: number,
  hasTrainingData: boolean,
): number | null {
  if (!hasTrainingData) return null;
  return Math.min(1, Math.max(0, (tsb + 20) / 40));
}

export function computeSleepSubScore(sleepAvg: number | null): number | null {
  if (sleepAvg === null) return null;
  // Deliberately NOT clamped (04 §5B / functional §3.3).
  return (sleepAvg - 1) / 6;
}

/**
 * `hasTrainingData` isn't directly exposed on `ReadinessResponse` — the backend
 * derives it from the 14-day load series (`any(r.load_au > 0)`) and never
 * returns it. This is a best-effort client-side inference, tightened to
 * minimize the one known failure mode (a real CTL===ATL day producing a
 * genuine `tsb === 0` that reads as "no data" — see below) as much as the
 * available fields allow:
 *
 * - `acwr !== null` is definitive proof training data exists (ACWR is only
 *   ever computed from the training-load series).
 * - When `acwr` is null and `sleep_avg` is ALSO null, any `factors_available
 *   > 0` must come from acwr/tsb (sleep can't be the source), so training
 *   data must exist even though acwr itself came back null (e.g. <14 days
 *   of history).
 * - When `sleep_avg` is present, `factors_available` alone is ambiguous (it
 *   could be sleep alone) — `tsb !== 0` is the best remaining signal, but it
 *   is NOT definitive: a real day with CTL≈ATL rounds to `tsb === 0` too,
 *   which this function will misclassify as no-data. Flagged as a residual
 *   gap: the clean fix is a `has_training_data: bool` field on
 *   `ReadinessResponse`, not something resolvable purely client-side.
 */
export function inferHasTrainingData(data: ReadinessResponse): boolean {
  if (data.acwr !== null) return true;
  if (data.sleep_avg === null) return data.factors_available > 0;
  return data.tsb !== 0;
}

export interface DominantFactor {
  key: "acwr" | "tsb" | "sleep";
  /** Signed deviation from the 0.5 neutral midpoint (positive = better than neutral). */
  deviation: number;
  sentence: string;
}

/**
 * Minimum |deviation| from the 0.5 neutral midpoint before a sub-score is
 * allowed to drive the one-dominant-factor sentence (04 §5B, "gated by a
 * minimum deviation threshold"). The doc resolves *that* a threshold exists
 * but leaves the exact number unvalidated ("Open items" #8) — 0.15 is this
 * implementation's first-principles choice (roughly "noticeably off-center",
 * screening out days where every sub-score sits close to neutral).
 */
export const DOMINANT_FACTOR_THRESHOLD = 0.15;

/** Build the one-dominant-factor sentence (04 §5B, Whoop "WELL RESTED" model). */
export function dominantFactorSentence(params: {
  acwrSubScore: number | null;
  acwr: number | null;
  tsbSubScore: number | null;
  tsb: number;
  sleepSubScore: number | null;
  sleepAvg: number | null;
}): string {
  const candidates: DominantFactor[] = [];

  if (params.acwrSubScore !== null && params.acwr !== null) {
    const dev = params.acwrSubScore - 0.5;
    const zone = acwrZoneLabel(acwrZone(params.acwr));
    candidates.push({
      key: "acwr",
      deviation: dev,
      sentence:
        dev >= 0
          ? `Your training load is in the ${zone} today (ACWR ${params.acwr.toFixed(
              2,
            )}).`
          : `Fatigue is high — your acute load is running ${zone} of your chronic base (ACWR ${params.acwr.toFixed(
              2,
            )}).`,
    });
  }

  if (params.tsbSubScore !== null) {
    const dev = params.tsbSubScore - 0.5;
    candidates.push({
      key: "tsb",
      deviation: dev,
      sentence:
        dev >= 0
          ? `You're fresh — form is trending positive (TSB ${params.tsb.toFixed(
              1,
            )}).`
          : `You're carrying fatigue — form is trending negative (TSB ${params.tsb.toFixed(
              1,
            )}).`,
    });
  }

  if (params.sleepSubScore !== null && params.sleepAvg !== null) {
    const dev = params.sleepSubScore - 0.5;
    candidates.push({
      key: "sleep",
      deviation: dev,
      sentence:
        dev >= 0
          ? `Solid sleep is boosting your readiness (avg ${params.sleepAvg.toFixed(
              1,
            )}/7).`
          : `Sleep is dragging your readiness down (avg ${params.sleepAvg.toFixed(
              1,
            )}/7).`,
    });
  }

  if (candidates.length === 0) return "No single factor stands out today.";

  const dominant = candidates.reduce((best, c) =>
    Math.abs(c.deviation) > Math.abs(best.deviation) ? c : best,
  );

  if (Math.abs(dominant.deviation) < DOMINANT_FACTOR_THRESHOLD) {
    return "No single factor stands out today.";
  }

  return dominant.sentence;
}

/**
 * Strain band (04 §5A, "FINALIZED 2026-07-18" z-score cutoffs: typical |z|<=1,
 * above 1<z<=2, well_above z>2).
 *
 * IMPLEMENTATION GAP (flag for follow-up): `compute_strain_score` in
 * apps/api/app/engine/metrics.py does NOT compute a z-score — it returns
 * `(active_today / active_28d_avg) * 100`, a percent-of-28-day-average ratio
 * clamped to [0, 100], with no baseline standard deviation exposed anywhere
 * in `ReadinessResponse`. A true z-score band is therefore not computable
 * from the current API contract. This function approximates the *shape* of
 * the spec (only the upward direction gets distinct copy; a below-average
 * day still reads `typical`) using percent-of-baseline thresholds in place of
 * standard deviations. The thresholds below are this implementation's
 * best-effort stand-in, not derived from the doc's exact z cutoffs — a real
 * fix needs the backend to expose (or this function to receive) the 28-day
 * baseline SD so an actual z-score can be computed.
 */
export type StrainBand = "typical" | "above" | "well_above";

export function strainBand(strainScore: number): StrainBand {
  if (strainScore > 150) return "well_above";
  if (strainScore > 120) return "above";
  return "typical";
}

const STRAIN_BAND_COPY: Record<StrainBand, string> = {
  typical: "typical for you",
  above: "above typical for you",
  well_above: "well above typical for you",
};

export function strainCopy(score: number): string {
  const band = strainBand(score);
  return `Strain ${Math.round(score)} — ${STRAIN_BAND_COPY[band]}`;
}
