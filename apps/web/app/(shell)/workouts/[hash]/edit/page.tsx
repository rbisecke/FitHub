import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api, ApiError } from "@/lib/api/client";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { EditWorkoutForm } from "@/components/logging/detail/EditWorkoutForm";
import type { DisplayUnits } from "@/lib/units";

/**
 * Edit-workout route (01 §7). Session-level fields only; result rows render
 * read-only. Light-themed like the whole domain. Server Component resolves the
 * workout by short_hash and fetches unit preferences.
 */
export default async function EditWorkoutRoute({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  const token = session.access_token;

  const { hash } = await params;

  const units: DisplayUnits = { weight: "kg", distance: "km" };
  try {
    const profile = await api.profile.get(token);
    units.weight = profile.weight_unit === "lb" ? "lb" : "kg";
    units.distance = profile.distance_unit === "mi" ? "mi" : "km";
  } catch {
    // Metric fallback.
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
      <EditWorkoutForm workout={workout} units={units} token={token} />
    </ForcedTheme>
  );
}
