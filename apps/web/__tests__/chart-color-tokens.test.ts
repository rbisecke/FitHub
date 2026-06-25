import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

// Guards the Phase 8 chart-coloring consolidation (style-updates/design/08):
// every recharts chart sources its colors from CSS design tokens — never a
// hardcoded hex, and never a hex --chart-* var wrapped in hsl() (invalid CSS,
// which silently drops the stroke).
const CHART_FILES = [
  "analytics/ACWRChart.tsx",
  "analytics/ACWRWidget.tsx",
  "analytics/MovementTrendChart.tsx",
  "analytics/VolumeChart.tsx",
  "analytics/StrengthProgressSection.tsx",
  "analytics/BenchmarkProgressSection.tsx",
  "analytics/TrainingBalanceSection.tsx",
  "records/PRSparkline.tsx",
  "records/TimelineView.tsx",
  "ui/donut-chart.tsx",
];

const files = CHART_FILES.map((rel) => ({
  path: rel,
  src: readFileSync(
    fileURLToPath(new URL(`../components/${rel}`, import.meta.url)),
    "utf8",
  ),
}));

describe("chart color tokens", () => {
  it("never wraps a hex --chart var in hsl() (invalid CSS, stroke vanishes)", () => {
    const offenders = files
      .filter(({ src }) => /hsl\(\s*var\(--chart/.test(src))
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });

  it("uses no hardcoded hex colors — all color comes from design tokens", () => {
    const offenders = files
      .filter(({ src }) => /#[0-9a-fA-F]{6}\b/.test(src))
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });
});
