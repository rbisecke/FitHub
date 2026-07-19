import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { SessionDetailScreen } from "@/components/plans/SessionDetailScreen";

/**
 * Session detail / preview route (02 §6) — the idle-phase preview of any
 * prescribed session. Light — review-before-execute (§1.1).
 */
export default async function SessionDetailRoute({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { id, sessionId } = await params;

  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <SessionDetailScreen
        planId={id}
        sessionId={sessionId}
        accessToken={session.access_token}
      />
    </ForcedTheme>
  );
}
