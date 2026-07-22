import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { StreakDetailScreen } from "@/components/dashboard/StreakDetailScreen";

/**
 * Streak-detail route (design-spec 07 §D "Streak-detail screen composition").
 * Reached by tapping the streak card on `/today`. Forced dark — a
 * celebratory/glanceable surface (Bible rule 1.1), like the streak card
 * itself and the contribution graph it renders.
 */
export default async function StreakDetailPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  return (
    <ForcedTheme theme="dark" className="min-h-svh">
      <StreakDetailScreen accessToken={session.access_token} />
    </ForcedTheme>
  );
}
