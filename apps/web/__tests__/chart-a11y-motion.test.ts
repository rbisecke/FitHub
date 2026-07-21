import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

// Guards the Phase 8c chart a11y + motion pass (style-updates/design/08):
// every recharts chart either gates animation on prefers-reduced-motion or
// disables it outright (sparklines), and the value-reading charts expose
// recharts' keyboard accessibilityLayer.
function read(rel: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../components/${rel}`, import.meta.url)),
    "utf8",
  );
}

// Every other pre-redesign recharts chart this guarded (ACWRChart, ACWRWidget,
// VolumeChart, StrengthProgressSection, BenchmarkProgressSection,
// ui/donut-chart) was deleted as confirmed-dead code once Effort 6
// (Domain 04) replaced their only live route (/analytics).
const ALL_CHARTS = [
  "analytics/MovementTrendChart.tsx",
  "records/PRSparkline.tsx",
  // TimelineView.tsx removed from chart guards — redesigned to plain HTML/SVG rail (no Recharts)
];

// Value-reading charts (not pure-decorative sparklines) get keyboard a11y.
const VALUE_CHARTS = ["analytics/MovementTrendChart.tsx"];

describe("chart accessibility + motion", () => {
  it("gates animation on every chart (reduced-motion or off)", () => {
    const offenders = ALL_CHARTS.filter(
      (rel) => !/isAnimationActive=/.test(read(rel)),
    );
    expect(offenders).toEqual([]);
  });

  it("animated value charts respect prefers-reduced-motion", () => {
    const offenders = VALUE_CHARTS.filter(
      (rel) => !/useReducedMotion/.test(read(rel)),
    );
    expect(offenders).toEqual([]);
  });

  it("exposes accessibilityLayer on value-reading charts", () => {
    const offenders = VALUE_CHARTS.filter(
      (rel) => !/accessibilityLayer/.test(read(rel)),
    );
    expect(offenders).toEqual([]);
  });
});
