// Shared types between apps/web and apps/api.
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
