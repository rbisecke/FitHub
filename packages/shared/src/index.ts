// Shared, framework-agnostic (non-JSX) code between apps/web and apps/api:
// types, Zod schemas, and pure utility math (09 §9).
// Generated DB types (supabase gen types typescript --local) go in src/database.ts.

export type UnitSystem = "kg" | "lb";

export interface Profile {
  id: string;
  handle: string;
  displayName: string;
  unitPreference: UnitSystem;
  timezone: string;
  role: "athlete" | "coach" | "admin";
  createdAt: string;
}

// Pure utility modules (unit-conversion math, deterministic identity color).
export * from "./identity-color";
export * from "./plate-calculator";
export * from "./cardio-conversion";
