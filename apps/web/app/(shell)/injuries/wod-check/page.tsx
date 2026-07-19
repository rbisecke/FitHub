import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { WodCheckerScreen } from "./WodCheckerScreen";

/**
 * Free-text WOD safety checker route (05 §5.2 — plan step 4.20). A separate
 * route from `/injuries` (not a tab within the list page) so it can be
 * deep-linked and screenshotted independently — see the doc comment on
 * `/injuries/page.tsx` for the full rationale.
 */
export default async function WodCheckPage() {
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
      <WodCheckerScreen token={session.access_token} />
    </ForcedTheme>
  );
}
