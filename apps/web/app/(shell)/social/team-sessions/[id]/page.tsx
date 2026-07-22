import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api, ApiError } from "@/lib/api/client";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { TeamSessionDetailClient } from "@/components/team-sessions/detail/TeamSessionDetailClient";

/**
 * `/social/team-sessions/[id]` — the live leaderboard / final-results detail
 * screen (design-spec 06 §3, §4, §6), the centerpiece of Domain 06. Dark
 * throughout (F1), both Live and Final phases.
 *
 * 404s (not 403s) whenever the caller isn't the creator or a participant —
 * the API itself returns 404 for that case (IDOR convention, §3 States), so
 * a plain `notFound()` here never leaks whether the session exists, matching
 * the same pattern already used by `/workouts/[hash]` and
 * `/movements/[slug]/[tab]`.
 */
export default async function TeamSessionDetailPage({
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
  const currentUserId = session.user.id;

  const { id } = await params;

  let initialSession;
  try {
    initialSession = await api.teamSessions.get(token, id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <ForcedTheme
      theme="dark"
      className="min-h-svh bg-background text-foreground"
    >
      <TeamSessionDetailClient
        token={token}
        currentUserId={currentUserId}
        initialSession={initialSession}
      />
    </ForcedTheme>
  );
}
