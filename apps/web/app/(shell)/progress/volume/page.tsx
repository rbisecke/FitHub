import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { VolumeTrendScreen } from "@/components/analytics/volume/VolumeTrendScreen";

/**
 * Screen 7 — Volume Trend (04-records-and-analytics.md). Light theme
 * (seated analysis, Bible 1.1). One of the five top-level Progress-tab
 * segments per the domain's Navigation table.
 */
export default async function VolumeTrendPage() {
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
      <VolumeTrendScreen accessToken={session.access_token} />
    </ForcedTheme>
  );
}
