import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { TrainingBalanceScreen } from "@/components/analytics/balance/TrainingBalanceScreen";

/**
 * Screen 8 — Training Balance (04-records-and-analytics.md). Light theme
 * (seated analysis, Bible 1.1). One of the five top-level Progress-tab
 * segments per the domain's Navigation table.
 */
export default async function TrainingBalancePage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <TrainingBalanceScreen accessToken={session.access_token} />
    </ForcedTheme>
  );
}
