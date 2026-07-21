import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { ReadinessDetailScreen } from "@/components/analytics/readiness/ReadinessDetailScreen";

/**
 * Screen 5B + Screen 6 (04-records-and-analytics.md) — the readiness arc's
 * tap-to-expand destination. A full-screen push, not a modal, reached from
 * the Today page's resting-view arc (`/today`). Dark theme: still a
 * glance-and-celebrate "why" screen, denser than the resting view but not a
 * seated analysis surface (unlike the light-themed Progress-tab screens).
 */
export default async function ReadinessDetailPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  return (
    <ForcedTheme
      theme="dark"
      className="min-h-svh bg-background text-foreground"
    >
      <ReadinessDetailScreen accessToken={session.access_token} />
    </ForcedTheme>
  );
}
