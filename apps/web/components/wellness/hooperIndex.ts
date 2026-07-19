/**
 * Hooper Index helpers (05 §3). The index is a plain sum of four 1-7 dimension
 * scores (range 4-28, lower = better) — mirrors `_hooper_index` in
 * `apps/api/app/routers/wellness.py` exactly so the live client-side total
 * shown before submit matches what the server will compute on submit.
 *
 * This is a DIFFERENT system from any future "recovery score" — do not render
 * it next to one, and do not relabel it.
 */

export type HooperBand = "ready" | "moderate" | "recover";

export interface HooperBandInfo {
  band: HooperBand;
  label: string;
  /** CSS custom-property token name (without var()), e.g. "green". */
  token: "green" | "amber" | "red";
}

export function hooperIndex(
  sleep: number,
  stress: number,
  fatigue: number,
  soreness: number,
): number {
  return sleep + stress + fatigue + soreness;
}

/** Interpretation band for a Hooper Index total (4-28). */
export function hooperBand(total: number): HooperBandInfo {
  if (total <= 12)
    return { band: "ready", label: "Ready to train", token: "green" };
  if (total <= 18)
    return { band: "moderate", label: "Moderate readiness", token: "amber" };
  return { band: "recover", label: "Recover first", token: "red" };
}

export type WellnessDimension = "sleep" | "stress" | "fatigue" | "soreness";

/**
 * Per-dimension banding tint (05 §3): sleep runs opposite the other three
 * (higher sleep score = better), so its threshold direction is inverted.
 */
export function dimensionBand(
  dimension: WellnessDimension,
  value: number,
): "green" | "amber" | "red" {
  const v = dimension === "sleep" ? 8 - value : value;
  if (v <= 2) return "green";
  if (v <= 5) return "amber";
  return "red";
}
