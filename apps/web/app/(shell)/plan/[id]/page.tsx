import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { PlanOverviewScreen } from "@/components/plans/overview/PlanOverviewScreen";

/**
 * Plan / calendar overview route (02 §4 Variant A, §5 Variant B). Light —
 * seated periodization analysis (§1.1), forced regardless of the app's
 * ambient theme (§13 item 5 — resolved, no dark-review variant).
 */
export default async function PlanDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <PlanOverviewScreen planId={id} accessToken={session.access_token} />
    </ForcedTheme>
  );
}
