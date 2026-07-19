import { describe, it, expect } from "vitest";
import {
  exampleFormSchema,
  exampleFormDefaults,
} from "@/lib/forms/example-schema";

/**
 * Validates the Zod v4 form-convention schema (0.21) — the resolver behind the example
 * form's field-level errors.
 */
describe("exampleFormSchema (Zod v4)", () => {
  it("accepts a well-formed payload", () => {
    const result = exampleFormSchema.safeParse({
      displayName: "Dana",
      email: "dana@example.com",
      unit: "lb",
    });
    expect(result.success).toBe(true);
  });

  it("trims and rejects a too-short name", () => {
    const result = exampleFormSchema.safeParse({
      displayName: " a ",
      email: "dana@example.com",
      unit: "kg",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["displayName"]);
    }
  });

  it("rejects an invalid email", () => {
    const result = exampleFormSchema.safeParse({
      displayName: "Dana",
      email: "not-an-email",
      unit: "kg",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an out-of-enum unit", () => {
    const result = exampleFormSchema.safeParse({
      displayName: "Dana",
      email: "dana@example.com",
      unit: "stone",
    });
    expect(result.success).toBe(false);
  });

  it("provides usable defaults", () => {
    expect(exampleFormDefaults.unit).toBe("kg");
  });
});
