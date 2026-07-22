import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { CoachShell } from "@/components/coach/CoachShell";

/**
 * `/coach/[sessionId]` — a specific resumed thread (design-spec 03 §1, §5). On
 * desktop this renders alongside the persistent session-list rail; on mobile
 * it's the full-screen thread view with a back affordance to `/coach`.
 */
export default async function CoachSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { sessionId } = await params;

  return (
    <ForcedTheme theme="dark" className="bg-background text-foreground">
      <CoachShell accessToken={session.access_token} sessionId={sessionId} />
    </ForcedTheme>
  );
}
