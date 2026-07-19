import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api, ApiError } from "@/lib/api/client";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { SessionExecutionView } from "@/components/session/SessionExecutionView";

/**
 * Session execution route (02 §7) — logs real sets against the
 * prescription. LIGHT, unconditionally (Bible 1.1 logging exception — the
 * one screen in this domain where theme is not negotiable, overriding the
 * dark treatment every other Domain-02 screen gets).
 */
export default async function SessionExecuteRoute({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { session: authSession },
  } = await supabase.auth.getSession();
  if (!authSession) redirect("/login");

  const { id, sessionId } = await params;
  const token = authSession.access_token;

  let plan;
  try {
    plan = await api.plans.get(token, id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const session = plan.sessions.find((s) => s.id === sessionId);
  if (!session) notFound();

  // An already-completed session has nothing left to execute — land on the
  // read-only detail view instead (the backend's own `prescribed`-only
  // status guard would reject a completion POST here anyway).
  if (session.status === "completed") {
    redirect(`/plan/${id}/sessions/${sessionId}`);
  }

  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <SessionExecutionView
        session={session}
        plan={{ id: plan.id, archetype: plan.archetype, title: plan.title }}
        accessToken={token}
      />
    </ForcedTheme>
  );
}
