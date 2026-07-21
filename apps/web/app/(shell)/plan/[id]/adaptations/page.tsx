import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import type { AdaptationOut } from "@/lib/api/plans";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { AdaptationReviewScreen } from "@/components/adaptations/AdaptationReviewScreen";

/**
 * Dedicated adaptation review route (design spec §8.3 — the flagship screen
 * of Domain 02). Light regardless of app theme (Bible 1.1 names
 * "plan-adaptation review" as a light moment explicitly). Server Component:
 * fetches the token and the plan's adaptation history for first paint; the
 * client screen owns the Viewed checklist, verdict submission, and every
 * §8.7 edge case, including the client-side retry path if this initial
 * fetch fails (a real possibility per design spec §13 item 10 — a plan with
 * a prior manual revision may 500 here until that gap is fixed).
 */
export default async function PlanAdaptationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { id: planId } = await params;
  const token = session.access_token;

  let initialAdaptations: AdaptationOut[] | null = null;
  let initialLoadFailed = false;
  try {
    initialAdaptations = await api.adaptations.list(token, planId);
  } catch (err) {
    // Logged server-side so a real failure (e.g. the §13 item 10 500 on a
    // plan with manual-revision history) is visible in server logs, not
    // just surfaced as the client's generic retry state.
    console.error(
      `adaptations page: failed to load history for plan ${planId}`,
      err,
    );
    initialLoadFailed = true;
  }

  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <AdaptationReviewScreen
        token={token}
        planId={planId}
        initialAdaptations={initialAdaptations}
        initialLoadFailed={initialLoadFailed}
      />
    </ForcedTheme>
  );
}
