import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { ModifyWorkoutResultsScreen } from "@/components/coach/ModifyWorkoutResultsScreen";

/**
 * Injury-adapt-this-session results route (03 §11), reached from the
 * "Injury-adapt this session" button on `SessionDetailScreen`. Light —
 * seated safety-review moment (§0.1), matching the sibling
 * `sessions/[sessionId]` and `.../execute` routes.
 */
export default async function ModifyWorkoutRoute({
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
      <ModifyWorkoutResultsScreen
        planId={id}
        sessionId={sessionId}
        accessToken={session.access_token}
      />
    </ForcedTheme>
  );
}
