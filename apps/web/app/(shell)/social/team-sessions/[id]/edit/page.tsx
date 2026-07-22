import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api, ApiError } from "@/lib/api/client";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { EditTeamSessionClient } from "@/components/team-sessions/EditTeamSessionClient";

/**
 * `/social/team-sessions/[id]/edit` — the creator-only edit form (design-spec
 * 06 §5). Light theme (F1 — seated data entry), unlike the dark detail screen
 * it returns to.
 *
 * Non-creators have no edit entry point in the UI (§5 States: "the edit
 * affordance simply isn't rendered for non-creators") — a non-creator who
 * still lands here directly is sent back to the (visible, dark) detail
 * screen rather than a confusing edit form they can't actually submit,
 * mirroring the API's own PATCH behavior (404s the update, doesn't 403 it).
 */
export default async function EditTeamSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  const token = session.access_token;

  const { id } = await params;

  let teamSession;
  try {
    teamSession = await api.teamSessions.get(token, id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  if (teamSession.created_by !== session.user.id) {
    redirect(`/social/team-sessions/${id}`);
  }

  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <EditTeamSessionClient accessToken={token} session={teamSession} />
    </ForcedTheme>
  );
}
