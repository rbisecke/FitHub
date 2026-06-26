import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

// Regression guard for the serif-headings bug.
//
// `next/font` loads Geist Sans/Mono under `--font-geist-sans` / `--font-geist-mono`.
// globals.css previously mapped Tailwind's sans to a self-reference
// (`--font-sans: var(--font-sans)`), which never resolved, so `font-sans` (and
// `font-heading`, which derives from it) fell back to the browser serif default —
// rendering all headings/body text in a serif. The fix points it at the loaded
// Geist variable. This test fails if the self-reference ever returns.
const css = readFileSync(
  fileURLToPath(new URL("../app/globals.css", import.meta.url)),
  "utf8",
);

describe("globals.css font tokens", () => {
  it("maps --font-sans to the loaded Geist Sans variable", () => {
    expect(css).toMatch(/--font-sans:\s*var\(--font-geist-sans\)\s*;/);
  });

  it("never leaves --font-sans as a self-reference", () => {
    expect(css).not.toMatch(/--font-sans:\s*var\(--font-sans\)\s*;/);
  });

  it("maps --font-mono to the loaded Geist Mono variable", () => {
    expect(css).toMatch(/--font-mono:\s*var\(--font-geist-mono\)\s*;/);
  });
});
