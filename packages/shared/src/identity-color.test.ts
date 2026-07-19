import { describe, it, expect } from "vitest";
import {
  identityColor,
  hashString,
  normalizeGuestName,
  IDENTITY_COLOR_COUNT,
  IDENTITY_COLOR_HEXES,
} from "./identity-color";

describe("identityColor", () => {
  it("returns a token name and matching var(), never a raw hex", () => {
    const c = identityColor("user-123");
    expect(c.index).toBeGreaterThanOrEqual(0);
    expect(c.index).toBeLessThan(IDENTITY_COLOR_COUNT);
    expect(c.token).toBe(`--identity-${c.index}`);
    expect(c.cssVar).toBe(`var(--identity-${c.index})`);
    // must not leak a hex through the API
    expect(c.token).not.toMatch(/#[0-9a-f]{6}/i);
  });

  it("is deterministic — the same seed always maps to the same index", () => {
    const a = identityColor("abc-def-ghi");
    const b = identityColor("abc-def-ghi");
    expect(a.index).toBe(b.index);
  });

  it("distributes a realistic roster across all 8 buckets", () => {
    const buckets = new Set<number>();
    for (let i = 0; i < 200; i++) {
      buckets.add(identityColor(`user-${i}-uuid`).index);
    }
    // With 200 distinct seeds every bucket should be hit.
    expect(buckets.size).toBe(IDENTITY_COLOR_COUNT);
  });

  it("has a hex literal for every palette index (reference only)", () => {
    expect(IDENTITY_COLOR_HEXES).toHaveLength(IDENTITY_COLOR_COUNT);
    for (const hex of IDENTITY_COLOR_HEXES) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("normalizes guest names so casing/whitespace don't split a person's color", () => {
    expect(normalizeGuestName("  Sam Smith ")).toBe("sam smith");
    const a = identityColor(normalizeGuestName("  Sam Smith "));
    const b = identityColor(normalizeGuestName("sam smith"));
    expect(a.index).toBe(b.index);
  });

  it("hashString is a stable unsigned 32-bit value", () => {
    const h = hashString("fithub");
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
    expect(hashString("fithub")).toBe(h);
  });
});
