import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { TrainingPartnersScreen } from "@/components/social/training-partners/TrainingPartnersScreen";

/**
 * Training partners roster (06 §8a/§8b, Effort 8). Light theme (F1 — seated
 * roster review), mirroring the `/profile` route's server-fetch-then-pass
 * pattern so the list has data on first paint.
 *
 * Not yet linked from the `/social` index (owned by the team-session list
 * screen in this same effort) — reachable directly at this URL today; a
 * small nav link should be added once that screen's layout lands.
 */
export default async function TrainingPartnersPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const token = session.access_token;

  let partners;
  try {
    partners = await api.trainingPartners(token);
  } catch {
    redirect("/login");
  }

  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <TrainingPartnersScreen token={token} initialPartners={partners} />
    </ForcedTheme>
  );
}
