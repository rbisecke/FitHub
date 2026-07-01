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

  it("draws the accent-coloured tile with a git-graph cut-out", () => {
    const html = renderToStaticMarkup(<FitHubMark />);
    // tile colour tracks the --accent token via currentColor
    expect(html).toContain("currentColor");
    expect(html).toContain("text-[var(--accent)]");
    // git-graph: tile rect + main-branch rect + 3 commit circles, all cut-out in page-bg
    const cutOuts = html.match(/fill="#0d1117"/g) ?? [];
    expect(cutOuts.length).toBeGreaterThanOrEqual(4); // rect + 3 circles + path stroke
    expect((html.match(/<circle/g) ?? []).length).toBe(3); // 3 commit nodes
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
