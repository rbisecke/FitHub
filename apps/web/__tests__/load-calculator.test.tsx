import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LoadCalculator } from "@/components/shared/LoadCalculator";

describe("LoadCalculator", () => {
  it("renders the $ load calculator header in inline mode", () => {
    const html = renderToStaticMarkup(
      <LoadCalculator mode="inline" bestKg={100} />,
    );
    expect(html).toContain("$ load calculator");
  });

  it("renders computed weight at 80% of bestKg by default", () => {
    // 80% of 100 kg = 80.0 kg
    const html = renderToStaticMarkup(
      <LoadCalculator mode="inline" bestKg={100} initialPct={80} />,
    );
    expect(html).toContain("80.0 kg");
  });

  it("renders plate-rounded metric output", () => {
    // 75% of 100 kg = 75.0 kg → nearest 2.5 = 75.0 kg
    const html = renderToStaticMarkup(
      <LoadCalculator mode="inline" bestKg={100} initialPct={75} />,
    );
    expect(html).toContain("≈ 75.0 kg (nearest 2.5 kg)");
  });

  it("shows basis toggle when currentKg is provided", () => {
    const html = renderToStaticMarkup(
      <LoadCalculator mode="inline" bestKg={100} currentKg={95} />,
    );
    expect(html).toContain("actual best");
    expect(html).toContain("est. today");
  });

  it("does not show basis toggle when currentKg is null", () => {
    const html = renderToStaticMarkup(
      <LoadCalculator mode="inline" bestKg={100} currentKg={null} />,
    );
    expect(html).not.toContain("actual best");
  });

  it("renders in sheet mode without the $ load calculator header", () => {
    const html = renderToStaticMarkup(
      <LoadCalculator mode="sheet" bestKg={100} initialPct={80} />,
    );
    expect(html).not.toContain("$ load calculator");
    // But still shows the computed weight
    expect(html).toContain("80.0 kg");
  });

  it("shows imperial output when weightUnit is lb", () => {
    // 80% of 100 kg = 80 kg = ~176.4 lb, rounded to nearest 5 = 175 lb
    const html = renderToStaticMarkup(
      <LoadCalculator
        mode="inline"
        bestKg={100}
        initialPct={80}
        weightUnit="lb"
      />,
    );
    // The display weight should be in lb
    expect(html).toContain("lb");
  });

  it("shows stale caveat text when isStale and basis is current", () => {
    // With isStale and currentKg, defaults to "current" basis
    const html = renderToStaticMarkup(
      <LoadCalculator
        mode="inline"
        bestKg={100}
        currentKg={95}
        isStale={true}
        initialPct={80}
      />,
    );
    expect(html).toContain("estimate may be outdated");
  });

  it("renders a copy button", () => {
    const html = renderToStaticMarkup(
      <LoadCalculator mode="inline" bestKg={100} />,
    );
    expect(html).toContain("copy");
  });
});
