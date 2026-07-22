import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api, ApiError } from "@/lib/api/client";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { WorkoutDetail } from "@/components/logging/detail/WorkoutDetail";
import type { DisplayUnits } from "@/lib/units";

/**
 * Workout detail route — "git show" (01 §6). Keyed by the cosmetic 8-hex
 * short_hash. Light regardless of app theme (Bible 1.1). Server Component:
 * resolves the workout by hash, fetches unit preferences, and hands both to the
 * client detail view (which computes strict PR badges + trend previews).
 */
export default async function WorkoutDetailRoute({
  params,
  searchParams,
}: {
  params: Promise<{ hash: string }>;
  searchParams: Promise<{ logged?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  const token = session.access_token;

  const { hash } = await params;
  const { logged } = await searchParams;
  const justLogged = logged === "1";

  const units: DisplayUnits = { weight: "kg", distance: "km" };
  try {
    const profile = await api.profile.get(token);
    units.weight = profile.weight_unit === "lb" ? "lb" : "kg";
    units.distance = profile.distance_unit === "mi" ? "mi" : "km";
  } catch {
    // Metric fallback — the page is fully usable without the preference.
  }

  let workout;
  try {
    workout = await api.workouts.getByHash(token, hash);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <WorkoutDetail
        workout={workout}
        units={units}
        token={token}
        justLogged={justLogged}
      />
    </ForcedTheme>
  );
}
