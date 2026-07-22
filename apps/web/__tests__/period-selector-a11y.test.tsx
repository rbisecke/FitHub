// @vitest-environment jsdom
/**
 * Effort 11.5 axe coverage gap-fill: PeriodSelector (components/analytics/,
 * Domain 04 / Effort 6 — Records & Analytics) had zero automated a11y
 * coverage. Note for the audit report: grepping the app tree found no
 * current callers of this component — it appears to be dead code, not
 * actually wired into /progress or the legacy /analytics route. Covered here
 * anyway since it's a real, exported component in a graduated domain and the
 * "no label prop" path had a genuine bug (see the aria-label fallback added
 * to PeriodSelector.tsx during this audit): the mobile trigger had no
 * accessible name at all when the optional `label` prop was omitted.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { PeriodSelector } from "@/components/analytics/PeriodSelector";

const OPTIONS = [
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
];

describe("PeriodSelector a11y", () => {
  it("has no axe violations with a label", async () => {
    const { container } = render(
      <PeriodSelector
        options={OPTIONS}
        value="30d"
        onChange={() => {}}
        label="Period"
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no axe violations without a label", async () => {
    const { container } = render(
      <PeriodSelector options={OPTIONS} value="7d" onChange={() => {}} />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
