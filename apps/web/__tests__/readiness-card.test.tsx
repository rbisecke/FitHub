import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ReadinessCard } from "@/components/analytics/ReadinessCard";
import type { ReadinessResponse } from "@/lib/api";

function makeReadiness(
  overrides: Partial<ReadinessResponse> = {},
): ReadinessResponse {
  return {
    score: 0.75,
    label: "optimal",
    acwr: 1.1,
    tsb: 5,
    mood_avg: null,
    sleep_avg: null,
    factors_available: 2,
    recovery_score: null,
    coverage: null,
    confidence_tier: null,
    hrv_type: null,
    strain_score: null,
    ...overrides,
  };
}

describe("ReadinessCard", () => {
  it("renders score as percentage", () => {
    const html = renderToStaticMarkup(
      <ReadinessCard data={makeReadiness({ score: 0.82 })} />,
    );
    expect(html).toContain("82%");
  });

  it("shows integrations link when no wearable data", () => {
    const html = renderToStaticMarkup(<ReadinessCard data={makeReadiness()} />);
    expect(html).toContain('href="/integrations"');
  });

  it("does not show integrations link in header when wearable data present", () => {
    const html = renderToStaticMarkup(
      <ReadinessCard
        data={makeReadiness({
          recovery_score: 0.8,
          coverage: 0.6,
          confidence_tier: "standard",
          hrv_type: "hrv_sdnn",
        })}
      />,
    );
    // The HRV recovery section should render
    expect(html).toContain("HRV (SDNN)");
    expect(html).toContain("28d baseline");
  });

  it("renders strain row with correct percentage when strain_score provided", () => {
    const html = renderToStaticMarkup(
      <ReadinessCard data={makeReadiness({ strain_score: 65 })} />,
    );
    expect(html).toContain("65%");
    // Amber color for 40-70 range
    expect(html).toContain("var(--amber)");
  });

  it("renders no-data strain row when strain_score is null", () => {
    const html = renderToStaticMarkup(
      <ReadinessCard data={makeReadiness({ strain_score: null })} />,
    );
    expect(html).toContain("no wearable data");
  });

  it("uses green/accent color for strain below 40%", () => {
    const html = renderToStaticMarkup(
      <ReadinessCard data={makeReadiness({ strain_score: 25 })} />,
    );
    // Strain pips and value use --accent for green
    expect(html).toContain("var(--accent)");
  });

  it("uses red color for strain above 70%", () => {
    const html = renderToStaticMarkup(
      <ReadinessCard data={makeReadiness({ strain_score: 85 })} />,
    );
    expect(html).toContain("var(--red)");
  });
});
