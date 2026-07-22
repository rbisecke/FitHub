import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { WodCheckerScreen } from "@/components/coach/WodCheckerScreen";

/**
 * Standalone WOD safety checker route (03 §12), plus the coach-side
 * log-parse launcher (03 §10). Light regardless of app theme (§0.1) — a
 * seated safety-review utility, not the coach "talking." Stateless: no
 * server-side data fetch, the check runs client-side on submit.
 */
export default async function CheckWodRoute() {
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
