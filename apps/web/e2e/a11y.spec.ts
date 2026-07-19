import { test, expect } from "@playwright/test";
import { scanWcag22AA } from "./utils/axe";

// Page-level a11y gate (0.28, 09 §8). Proves the axe-core/playwright layer runs against
// a real rendered route and reports zero WCAG 2.2 AA violations. Domain screens add
// their own scans (and interaction-state scans) as they're built in later Efforts.

test.describe("accessibility — WCAG 2.2 AA", () => {
  test("design-token reference page has no violations", async ({ page }) => {
    await page.goto("/dev/tokens");
    const results = await scanWcag22AA(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test("primitives showcase has no violations", async ({ page }) => {
    await page.goto("/dev/primitives");
    const results = await scanWcag22AA(page).analyze();
    expect(results.violations).toEqual([]);
  });
});
