import type { Page } from "@playwright/test";

export interface InteractionTiming {
  action: string;
  durationMs: number;
  thresholdMs: number;
  passed: boolean;
}

/**
 * Measure the wall-clock time between a page interaction and a visible DOM update.
 * Uses the browser's own performance.now() so the measurement isn't affected by
 * Node.js event-loop latency.
 */
export async function measureInteraction(
  page: Page,
  action: string,
  trigger: () => Promise<void>,
  condition: () => Promise<void>,
  thresholdMs = 300,
): Promise<InteractionTiming> {
  const t0 = await page.evaluate(() => performance.now());
  await trigger();
  await condition();
  const t1 = await page.evaluate(() => performance.now());
  const durationMs = Math.round(t1 - t0);
  return { action, durationMs, thresholdMs, passed: durationMs <= thresholdMs };
}

export interface PageLoadTiming {
  ttfbMs: number;
  domContentLoadedMs: number;
  loadMs: number;
}

/** Navigation timing for the most recently loaded page. */
export async function pageLoadTiming(page: Page): Promise<PageLoadTiming> {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming;
    return {
      ttfbMs: Math.round(nav.responseStart - nav.requestStart),
      domContentLoadedMs: Math.round(
        nav.domContentLoadedEventEnd - nav.fetchStart,
      ),
      loadMs: Math.round(nav.loadEventEnd - nav.fetchStart),
    };
  });
}

export interface SlowResource {
  name: string;
  durationMs: number;
}

/** Return all resource requests that exceeded thresholdMs, sorted slowest-first. */
export async function slowResources(
  page: Page,
  thresholdMs = 500,
): Promise<SlowResource[]> {
  return page.evaluate((threshold) => {
    return performance
      .getEntriesByType("resource")
      .map((r) => ({ name: r.name, durationMs: Math.round(r.duration) }))
      .filter((r) => r.durationMs > threshold)
      .sort((a, b) => b.durationMs - a.durationMs);
  }, thresholdMs);
}

/** Latency thresholds that match the QA doc expectations. */
export const THRESHOLDS = {
  /** Page navigation: TTFB target */
  ttfbMs: 200,
  /** Page navigation: full load */
  loadMs: 1000,
  /** Client-only state change (e.g. form submit → success card swap) */
  clientStateMs: 200,
  /** Dialog / modal open */
  dialogOpenMs: 150,
  /** Typeahead / autocomplete result */
  autocompleteMs: 300,
  /** API-backed response (AI stubbed) */
  apiResponseMs: 1000,
} as const;
