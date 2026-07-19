import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import type { InjuryOut } from "@/lib/api/plans";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { InjuryListScreen } from "@/components/injuries/InjuryListScreen";

/**
 * Injury list route — "05 §2" (plan step 4.13). Light regardless of app
 * theme (Bible §1.1's clinical self-report exception, same rule as the Log
 * surface). Server Component: fetches the token and the first page of
 * injuries for first paint; the client screen owns the detail sheet, status
 * transitions, and the client-side retry path if this initial fetch fails.
 *
 * A "Check a WOD" entry point links to `/injuries/wod-check` — kept as a
 * separate route (not a tab within this page) so it can be deep-linked and
 * screenshotted independently, and so the list page's own loading/error/
 * empty states stay simple or single-purpose.
 */
export default async function InjuriesPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const token = session.access_token;

  let initialInjuries: InjuryOut[] | null = null;
  let initialLoadFailed = false;
  try {
    initialInjuries = await api.injuries.list(token);
  } catch {
    initialLoadFailed = true;
  }

  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <InjuryListScreen
        token={token}
        initialInjuries={initialInjuries}
        initialLoadFailed={initialLoadFailed}
        wodCheckHref="/injuries/wod-check"
      />
    </ForcedTheme>
  );
}
