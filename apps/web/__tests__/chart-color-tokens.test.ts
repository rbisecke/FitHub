import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

// Guards the Phase 8 chart-coloring fix (style-updates/design/08).
//
// The --chart-* / --chart-ref-* / --chart-axis tokens in globals.css are HEX
// literals (e.g. --chart-1: #22d3ee). Wrapping a hex var in hsl() —
// `hsl(var(--chart-1))` — produces `hsl(#22d3ee)`, which is invalid CSS, so the
// stroke silently fails to render. Series colors must consume the tokens
// directly as `var(--chart-N)`.
function tsxFilesUnder(dir: string): { path: string; src: string }[] {
  const base = fileURLToPath(new URL(`../components/${dir}`, import.meta.url));
  return readdirSync(base)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => ({
      path: `components/${dir}/${f}`,
      src: readFileSync(`${base}/${f}`, "utf8"),
    }));
}

const chartFiles = [...tsxFilesUnder("analytics"), ...tsxFilesUnder("records")];

describe("chart color tokens", () => {
  it("never wraps a hex --chart var in hsl() (invalid CSS, stroke vanishes)", () => {
    const offenders = chartFiles
      .filter(({ src }) => /hsl\(\s*var\(--chart/.test(src))
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });
});
