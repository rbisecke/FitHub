import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

// Guards the Phase 2 color/accent-system tokens (style-updates/design/02).
const css = readFileSync(
  fileURLToPath(new URL("../app/globals.css", import.meta.url)),
  "utf8",
);

describe("globals.css color & elevation tokens", () => {
  it("defines elevation tiers and a stronger muted", () => {
    expect(css).toMatch(/--surface-2:\s*#1c2128/);
    expect(css).toMatch(/--surface-3:\s*#222831/);
    expect(css).toMatch(/--muted-strong:\s*#a0aab4/);
  });

  it("elevates overlays — --popover is lighter than the #161b22 card surface", () => {
    expect(css).toMatch(/--popover:\s*#1c2128/);
  });

  it("exposes the new tokens as Tailwind theme colors", () => {
    expect(css).toMatch(/--color-surface-3:\s*var\(--surface-3\)/);
    expect(css).toMatch(/--color-muted-strong:\s*var\(--muted-strong\)/);
  });
});
