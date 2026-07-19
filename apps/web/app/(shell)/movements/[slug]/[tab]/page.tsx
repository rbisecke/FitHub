import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api, ApiError } from "@/lib/api/client";
import { ForcedTheme } from "@/components/shared/forced-theme";
import {
  MovementDetailShell,
  type MovementTab,
} from "@/components/logging/movement/MovementDetailShell";
import type { DisplayUnits } from "@/lib/units";

const TABS = new Set<MovementTab>(["about", "history", "charts", "records"]);

/**
 * Movement detail tab route (01 §9). Path-segment tabs (About/History/Charts/
 * Records); the `(implement, side)` scope lives in `?implement=&side=` so it
 * persists across tabs. Light regardless of app theme (Bible 1.1). Server
 * Component resolves the movement by slug and reads scope from the query.
 */
export default async function MovementTabRoute({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; tab: string }>;
  searchParams: Promise<{ implement?: string; side?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  const token = session.access_token;

  const { slug, tab } = await params;
  if (!TABS.has(tab as MovementTab)) notFound();

  const units: DisplayUnits = { weight: "kg", distance: "km" };
  let equipment: string[] = [];
  try {
    const profile = await api.profile.get(token);
    units.weight = profile.weight_unit === "lb" ? "lb" : "kg";
    units.distance = profile.distance_unit === "mi" ? "mi" : "km";
    equipment = profile.equipment_access ?? [];
  } catch {
    // Metric fallback; substitutes still work with an empty equipment set.
  }

  let movement;
  try {
    movement = await api.movements.getBySlug(token, slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const { implement, side } = await searchParams;

  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <MovementDetailShell
        movement={movement}
        tab={tab as MovementTab}
        implement={implement ?? null}
        side={side ?? null}
        units={units}
        equipment={equipment}
        token={token}
      />
    </ForcedTheme>
  );
}
