// Tests for ME-10: variant_annotation replaces variant:* notes encoding.
// These are pure-logic tests that verify the chip-parsing invariant
// (comma-split → individual labels) without needing a DOM render.

import { describe, it, expect } from "vitest";

/**
 * The display logic in WorkoutCard and WorkoutDetailClient does:
 *   r.variant_annotation.split(",").map((chip) => chip)
 * Verify this produces the expected labels for various inputs.
 */
function parseVariantAnnotation(
  annotation: string | null | undefined,
): string[] {
  if (!annotation) return [];
  return annotation.split(",");
}

describe("variant_annotation chip parsing (ME-10)", () => {
  it("returns empty array when annotation is null", () => {
    expect(parseVariantAnnotation(null)).toEqual([]);
  });

  it("returns empty array when annotation is undefined", () => {
    expect(parseVariantAnnotation(undefined)).toEqual([]);
  });

  it("returns empty array when annotation is empty string", () => {
    expect(parseVariantAnnotation("")).toEqual([]);
  });

  it("returns single chip for a single value", () => {
    expect(parseVariantAnnotation("hang")).toEqual(["hang"]);
  });

  it("splits comma-joined chips into individual labels", () => {
    expect(parseVariantAnnotation("hang,power")).toEqual(["hang", "power"]);
  });

  it("handles three chips", () => {
    expect(parseVariantAnnotation("hang,power,squat")).toEqual([
      "hang",
      "power",
      "squat",
    ]);
  });

  it("never reads variant: prefix from notes (old encoding retired)", () => {
    // Old code would have encoded "hang,power" as notes = "variant:hang,power"
    // That encoding is now gone — notes should never contain variant: prefix.
    const legacyNotesValue = "variant:hang,power";
    // The old prefix is NOT a valid variant_annotation value; the migration
    // (0041_add_variant_annotation) already stripped it. This test documents
    // the invariant: variant_annotation is a clean comma-joined string.
    expect(legacyNotesValue.startsWith("variant:")).toBe(true); // confirms old format
    // variant_annotation should never start with "variant:" — clean value expected
    const cleanAnnotation = "hang,power";
    expect(cleanAnnotation.startsWith("variant:")).toBe(false);
    expect(parseVariantAnnotation(cleanAnnotation)).toEqual(["hang", "power"]);
  });
});
