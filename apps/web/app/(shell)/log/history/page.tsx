import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { HistoryFeed } from "@/components/logging/history/HistoryFeed";
import type { DisplayUnits } from "@/lib/units";

/**
 * History feed route — "git log" (01 §5). Light regardless of app theme (Bible
 * 1.1's gym-legibility exception). Server Component: fetches the token, the
 * user's unit preferences, and the first page of workout summaries for first
 * paint; the client feed handles filters, infinite scroll, and lazy expansion.
 *
 * `?movement=<id>&movementName=<name>` re-scopes the feed to one movement — the
 * "see all X history" entry point from a workout detail (§6, §5.3).
 */
export default async function HistoryRoute({
  searchParams,
}: {
  searchParams: Promise<{ movement?: string; movementName?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const token = session.access_token;

  const units: DisplayUnits = { weight: "kg", distance: "km" };
  try {
    const profile = await api.profile.get(token);
    units.weight = profile.weight_unit === "lb" ? "lb" : "kg";
    units.distance = profile.distance_unit === "mi" ? "mi" : "km";
  } catch {
    // Fall back to metric — the feed is fully usable without the preference.
  }

  let initialItems: Awaited<ReturnType<typeof api.workouts.list>>["items"] = [];
  let initialCursor: string | null = null;
  try {
    const res = await api.workouts.list(token, { limit: 20 });
    initialItems = res.items;
    initialCursor = res.next_cursor;
  } catch {
    // Client feed shows a retry affordance on an empty first paint.
  }

  const params = await searchParams;
  const movementFilter =
    params.movement && params.movementName
      ? { id: params.movement, name: params.movementName }
      : null;

  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <HistoryFeed
        token={token}
        units={units}
        initialItems={initialItems}
        initialCursor={initialCursor}
        movementFilter={movementFilter}
      />
    </ForcedTheme>
  );
}
