import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { MovementDetailScreen } from "@/components/records/detail/MovementDetailScreen";
import type { SummaryVariant } from "@/components/records/detail/SummaryTab";
import type { PersonalRecord } from "@/lib/api";
import type { DisplayUnits } from "@/lib/units";

function isSummaryVariant(value: string | undefined): value is SummaryVariant {
  return value === "a" || value === "b" || value === "c";
}

/**
 * Movement Detail route (design-spec 04 Screen 2, `/progress/records/[movementId]`).
 * Light theme — a deliberate dark->light transition from Records Home
 * (Bible 1.1), forced here regardless of the `/progress` layout's dark nav
 * bar above it. Optional `?implement=&side=` scope one variant of a
 * multi-variant movement (BG-23); `?variant=a|b|c` previews a specific
 * Screen 2C composition (Open Decision #6 — all three must stay reachable).
 */
export default async function MovementDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ movementId: string }>;
  searchParams: Promise<{
    implement?: string;
    side?: string;
    variant?: string;
  }>;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const token = session.access_token;
  const { movementId } = await params;
  const query = await searchParams;
  const implement = query.implement ?? null;
  const side = query.side ?? null;
  const initialVariant: SummaryVariant = isSummaryVariant(query.variant)
    ? query.variant
    : "a";

  const units: DisplayUnits = { weight: "kg", distance: "km" };
  let record: PersonalRecord | null = null;
  let movementName = "This movement";
  let initialLoadFailed = false;

  try {
    const profile = await api.profile.get(token);
    units.weight = profile.weight_unit === "lb" ? "lb" : "kg";
    units.distance = profile.distance_unit === "mi" ? "mi" : "km";

    const records = await api.analytics.personalRecords(token);
    const matches = records.filter((r) => r.movement_id === movementId);
    record =
      (implement != null || side != null
        ? matches.find((r) => r.implement === implement && r.side === side)
        : undefined) ??
      matches.sort((a, b) => b.best_1rm_kg - a.best_1rm_kg)[0] ??
      null;

    if (record) {
      movementName = record.movement_name;
    } else {
      // Best-effort name resolution for the non-loaded-movement fallback
      // (2F): there's no `GET /movements/{id}` endpoint, so this searches
      // the catalog page and matches by id. A movement catalog beyond this
      // page size would fall back to the generic "This movement" label —
      // a known limitation of working within the existing API surface.
      const catalog = await api.movements.search(token, { limit: 100 });
      const found = catalog.find((m) => m.id === movementId);
      if (found) movementName = found.name;
    }
  } catch {
    initialLoadFailed = true;
  }

  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <MovementDetailScreen
        token={token}
        movementId={movementId}
        movementName={movementName}
        units={units}
        implement={implement}
        side={side}
        initialVariant={initialVariant}
        initialRecord={record}
        initialLoadFailed={initialLoadFailed}
      />
    </ForcedTheme>
  );
}
