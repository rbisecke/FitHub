import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Step4FirstWorkout } from "@/components/onboarding/Step4FirstWorkout";

describe("Step4FirstWorkout", () => {
  const noop = () => {};

  it("renders the $ git commit option linking to /log/new", () => {
    const html = renderToStaticMarkup(
      <Step4FirstWorkout
        token="tok"
        onNext={noop}
        onSkip={noop}
        onBack={noop}
      />,
    );
    expect(html).toContain("$ git commit");
    expect(html).toContain("Log a workout");
    expect(html).toContain('href="/log/new"');
  });

  it("renders the $ git tag option linking to /log/tag", () => {
    const html = renderToStaticMarkup(
      <Step4FirstWorkout
        token="tok"
        onNext={noop}
        onSkip={noop}
        onBack={noop}
      />,
    );
    expect(html).toContain("$ git tag");
    expect(html).toContain("Tag a PR");
    expect(html).toContain('href="/log/tag"');
  });

  it("renders a Skip for now button", () => {
    const html = renderToStaticMarkup(
      <Step4FirstWorkout
        token="tok"
        onNext={noop}
        onSkip={noop}
        onBack={noop}
      />,
    );
    expect(html).toContain("Skip for now");
  });

  it("renders both options at equal visual weight using flex-1", () => {
    const html = renderToStaticMarkup(
      <Step4FirstWorkout
        token="tok"
        onNext={noop}
        onSkip={noop}
        onBack={noop}
      />,
    );
    const flex1Count = (html.match(/flex-1/g) ?? []).length;
    expect(flex1Count).toBeGreaterThanOrEqual(2);
  });
});
