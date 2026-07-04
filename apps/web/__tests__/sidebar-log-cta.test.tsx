import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SidebarLogCTA } from "@/components/layout/SidebarLogCTA";

describe("SidebarLogCTA", () => {
  it("renders the primary Log Workout link to /log/new", () => {
    const html = renderToStaticMarkup(<SidebarLogCTA />);
    expect(html).toContain('href="/log/new"');
    expect(html).toContain("Log Workout");
  });

  it("renders the secondary $ git tag link to /log/tag", () => {
    const html = renderToStaticMarkup(<SidebarLogCTA />);
    expect(html).toContain('href="/log/tag"');
  });

  it("secondary action contains $ git tag label and sublabel", () => {
    const html = renderToStaticMarkup(<SidebarLogCTA />);
    expect(html).toContain("$ git tag");
    expect(html).toContain("Tag a milestone");
  });
});
