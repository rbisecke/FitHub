import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

// Page/flow-level accessibility scan (0.28, 09 §8). `@axe-core/playwright` scoped to
// the WCAG 2.2 AA tag set — the "Level A + AA up to 2.2" bundle the project targets.
// Catches ~57% of WCAG issues by volume automatically against real rendered DOM;
// manual NVDA/VoiceOver review still covers the hardest components (09 §8).

export const WCAG_22_AA_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
] as const;

/** Build an axe scan for the current page scoped to WCAG 2.2 AA. */
export function scanWcag22AA(page: Page): AxeBuilder {
  return new AxeBuilder({ page }).withTags([...WCAG_22_AA_TAGS]);
}
