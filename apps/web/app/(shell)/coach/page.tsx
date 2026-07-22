import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { CoachShell } from "@/components/coach/CoachShell";

/**
 * `/coach` — the session list (design-spec 03 §5, §6.1). Nav always lands here,
 * never on the last-active thread. Also the empty/new-thread state (mobile:
 * toggled client-side within `CoachShell`; desktop: shown side-by-side with the
 * rail). `?prompt=…` seeds the composer for a contextual "ask about this" entry
 * point (§6.4) — populate-for-editing, never auto-submit.
 *
 * Dark conversational surface throughout (§0.1) via `ForcedTheme`.
 */
export default async function CoachPage({
  searchParams,
}: {
  searchParams: Promise<{ prompt?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { prompt } = await searchParams;

  return (
    <ForcedTheme theme="dark" className="bg-background text-foreground">
      <CoachShell
        accessToken={session.access_token}
        sessionId={null}
        initialPrompt={prompt}
      />
    </ForcedTheme>
  );
}
