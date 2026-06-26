import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FitHubMark } from "@/components/layout/FitHubMark";

describe("FitHubMark", () => {
  it("renders an svg at the requested size", () => {
    const html = renderToStaticMarkup(<FitHubMark size={40} />);
    expect(html).toContain("<svg");
    expect(html).toContain('width="40"');
    expect(html).toContain('height="40"');
    expect(html).toContain('viewBox="0 0 24 24"');
  });

  it("draws the green tile and the carved F (three rects in the page-bg colour)", () => {
    const html = renderToStaticMarkup(<FitHubMark />);
    // tile colour tracks the --green token via currentColor
    expect(html).toContain("currentColor");
    expect(html).toContain("text-[var(--green)]");
    // the F is three rects filled with the page background so it reads as a cut-out
    const carved = html.match(/fill="#0d1117"/g) ?? [];
    expect(carved.length).toBe(1); // single <g fill> wrapping the three rects
    expect((html.match(/<rect/g) ?? []).length).toBe(4); // tile + 3 F strokes
  });

  it("is an accessible image named FitHub by default", () => {
    const html = renderToStaticMarkup(<FitHubMark />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="FitHub"');
    expect(html).toContain("<title>FitHub</title>");
  });

  it("hides itself from assistive tech when decorative", () => {
    const html = renderToStaticMarkup(<FitHubMark decorative />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('aria-label="FitHub"');
    expect(html).not.toContain("<title>");
  });
});
