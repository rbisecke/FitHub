import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FitHubMark } from "@/components/layout/FitHubMark";

describe("FitHubMark", () => {
  it("renders a container div at the requested size", () => {
    const html = renderToStaticMarkup(<FitHubMark size={40} />);
    expect(html).toContain("width:40px");
    expect(html).toContain("height:40px");
  });

  it("renders an accent-coloured square container with an inner git-graph SVG", () => {
    const html = renderToStaticMarkup(<FitHubMark />);
    // Green accent background on the container div
    expect(html).toContain("var(--accent)");
    // Stroke-based inner SVG (no fill cut-outs)
    expect(html).toContain("<svg");
    expect(html).toContain('viewBox="0 0 24 24"');
    // 3 commit nodes
    expect((html.match(/<circle/g) ?? []).length).toBe(3);
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
