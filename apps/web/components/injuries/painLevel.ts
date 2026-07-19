/**
 * Pure pain-level logic (05 §1.2) — kept separate from the track control so
 * the severity ramp and the high-pain red-flag threshold are unit-testable
 * without rendering anything.
 */

export interface PainWordAnchor {
  level: number;
  word: string;
}

/** Word anchors along the 0-10 track — deterministic, not a vibe (05 §1.2). */
export const PAIN_WORD_ANCHORS: readonly PainWordAnchor[] = [
  { level: 0, word: "None" },
  { level: 2, word: "Mild" },
  { level: 5, word: "Moderate" },
  { level: 7, word: "Severe" },
  { level: 10, word: "Worst imaginable" },
];

export type PainSeverityBand = "green" | "amber" | "red";

/** green (0-3) -> amber (4-7) -> red (8-10), matching the 8+ referral floor. */
export function painSeverityBand(level: number): PainSeverityBand {
  if (level >= 8) return "red";
  if (level >= 4) return "amber";
  return "green";
}

export function painColorToken(level: number): string {
  const band = painSeverityBand(level);
  return `var(--${band})`;
}

/** 8, 9, 10 — the deterministic pre-echo of the referral verdict (05 §1.5). */
export function isHighPain(level: number): boolean {
  return level >= 8;
}
