/**
 * Empty-state starter prompts (design-spec 03 §8.1) — literal copy, order, and
 * tap-behavior tag, finalized 2026-07-18. "self-contained" cards send immediately;
 * "template" cards (with an implied blank) populate the composer for editing
 * instead, so a genuinely incomplete prompt never burns a rate-limited call.
 */
export interface StarterPrompt {
  id: string;
  /** Card copy, shown verbatim (literal wording from the design spec). */
  text: string;
  tag: "self-contained" | "template";
  /**
   * For a "template" card only: the text that actually populates the composer
   * (no trailing "…" — that's card-copy punctuation, not something to type
   * into the input). The cursor lands at the end, at the implied blank.
   */
  composerValue?: string;
}

export const STARTER_PROMPTS: StarterPrompt[] = [
  {
    id: "review-last-week",
    text: "Review my last week",
    tag: "self-contained",
  },
  { id: "suggest-deload", text: "Suggest a deload", tag: "self-contained" },
  {
    id: "convert-cardio",
    text: "Convert this cardio to machine equivalents: …",
    tag: "template",
    composerValue: "Convert this cardio to machine equivalents: ",
  },
  {
    id: "load-trending",
    text: "How's my training load trending?",
    tag: "self-contained",
  },
];

export const STARTER_GREETING = "What are we working on today?";
