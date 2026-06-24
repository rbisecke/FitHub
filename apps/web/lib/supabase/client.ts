"use client";

import { createBrowserClient } from "@supabase/ssr";

// NEXT_PUBLIC_* vars must be accessed with a static literal key so Turbopack
// can inline them at compile time. Dynamic bracket access (process.env[key])
// defeats static analysis and produces undefined in the browser bundle.
// Guard inside createClient() (not at module level) so SSG prerendering can
// evaluate this module without env vars present in the build sandbox.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function createClient() {
  if (!SUPABASE_URL) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!SUPABASE_ANON_KEY)
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
