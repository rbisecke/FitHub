/**
 * Post-answer follow-up chips (design-spec 03 §8.2). Client-side, deterministic
 * keyword matching against the FINISHED assistant answer text — never model
 * output (the model only ever emits `{answer}`). Up to 2 chips, first-match-wins
 * by keyword-list order — no ranking heuristic beyond that, so the rule stays
 * fully deterministic and testable.
 *
 * Only applies to a COACH-tier answer. STOP suppresses follow-ups entirely
 * (§8.2); MODIFY gets a different, fixed deep-link chip instead (§13) — see
 * `MODIFY_TIER_CHIP` below, not produced by this matcher.
 */

export interface FollowUpChip {
  /** Stable id for React keys — derived from the keyword bank entry, not an index. */
  id: string;
  label: string;
}

interface ChipBankEntry {
  id: string;
  /** Lowercase keywords/phrases; any one matching triggers this entry's chip. */
  keywords: string[];
  label: string;
}

/** Literal bank from design-spec §8.2's example table, in match-priority order. */
const CHIP_BANK: ChipBankEntry[] = [
  { id: "deload", keywords: ["deload"], label: "Why a deload?" },
  {
    id: "acwr",
    keywords: ["acwr", "acute:chronic", "acute to chronic"],
    label: "What's a safe ACWR range?",
  },
  { id: "rpe", keywords: ["rpe"], label: "How do I estimate RPE?" },
  {
    id: "rest-recovery",
    keywords: ["rest day", "rest days", "recovery"],
    label: "How many rest days do I need?",
  },
];

const MAX_CHIPS = 2;

/** Fixed MODIFY-tier deep-link chip (§13) — not from the keyword bank. */
export const MODIFY_TIER_CHIP: FollowUpChip = {
  id: "modify-review-change",
  label: "Review the change →",
};

/** Scan `answerText` for the bank's keywords and return up to 2 matched chips,
 * in keyword-list order. Returns [] on no match — a quiet enhancement, not a
 * guaranteed row. */
export function matchFollowUpChips(answerText: string): FollowUpChip[] {
  const haystack = answerText.toLowerCase();
  const chips: FollowUpChip[] = [];
  for (const entry of CHIP_BANK) {
    if (chips.length >= MAX_CHIPS) break;
    if (entry.keywords.some((kw) => haystack.includes(kw))) {
      chips.push({ id: entry.id, label: entry.label });
    }
  }
  return chips;
}
