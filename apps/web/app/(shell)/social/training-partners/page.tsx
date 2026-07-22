import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { TrainingPartnersScreen } from "@/components/social/training-partners/TrainingPartnersScreen";

/**
 * Training partners roster (06 §8a/§8b, Effort 8). Light theme (F1 — seated
 * roster review), mirroring the `/profile` route's server-fetch-then-pass
 * pattern so the list has data on first paint. Cross-linked from the
 * team-session list screen (and links back to it).
 */
export default async function TrainingPartnersPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const token = session.access_token;

  let partners: Awaited<ReturnType<typeof api.trainingPartners>> = [];
  let initialLoadFailed = false;
  try {
    partners = await api.trainingPartners(token);
  } catch {
    initialLoadFailed = true;
  }

  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <TrainingPartnersScreen
        token={token}
        initialPartners={partners}
        initialLoadFailed={initialLoadFailed}
      />
    </ForcedTheme>
  );
}
