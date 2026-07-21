import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { RecordsHomeScreen } from "@/components/records/RecordsHomeScreen";
import type { PersonalRecord } from "@/lib/api";

/**
 * Records Home route (design-spec 04 Screen 1, "Records" Progress-tab
 * segment). Dark — a glance-and-celebrate surface (Bible 1.1), forced by the
 * shared `/progress` layout. Server Component: fetches the token, the
 * user's weight-display unit, and the first page of PRs for first paint.
 *
 * Layout slot: Domain 07's contribution graph + streak display render
 * ABOVE this screen's content, per `00-design-system-and-cross-cutting.md`
 * Part 4 — this screen is only the PR-list section beneath them. That slot
 * isn't wired up yet (Effort 9 owns it); when it lands, it renders here,
 * before <RecordsHomeScreen>.
 */
export default async function RecordsHomePage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const token = session.access_token;

  let weightUnit: "kg" | "lb" = "kg";
  let initialData: PersonalRecord[] | null = null;
  let initialLoadFailed = false;
  try {
    const [profile, records] = await Promise.all([
      api.profile.get(token),
      api.analytics.personalRecords(token),
    ]);
    weightUnit = profile.weight_unit === "lb" ? "lb" : "kg";
    initialData = records;
  } catch {
    initialLoadFailed = true;
  }

  return (
    <RecordsHomeScreen
      token={token}
      weightUnit={weightUnit}
      initialData={initialData}
      initialLoadFailed={initialLoadFailed}
    />
  );
}
