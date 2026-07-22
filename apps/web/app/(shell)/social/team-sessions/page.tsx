import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { TeamSessionListScreen } from "@/components/team-sessions/TeamSessionListScreen";
import type { TeamSessionListResponse } from "@/lib/api";

const PAGE_SIZE = 20;

/**
 * Team-session list route (design-spec 06 §1, §F7). Dark — a glanceable
 * index into celebratory leaderboard content (F1). Server Component: fetches
 * the token and the first page for first paint; `TeamSessionListScreen`
 * (client) owns infinite scroll, the create form, and all interaction state.
 */
export default async function TeamSessionsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const token = session.access_token;

  let initialData: TeamSessionListResponse | null = null;
  let initialLoadFailed = false;
  try {
    initialData = await api.teamSessions.list(token, { limit: PAGE_SIZE });
  } catch {
    initialLoadFailed = true;
  }

  return (
    <ForcedTheme theme="dark" className="bg-background text-foreground">
      <TeamSessionListScreen
        accessToken={token}
        initialItems={initialData?.items ?? []}
        initialNextCursor={initialData?.next_cursor ?? null}
        initialLoadFailed={initialLoadFailed}
      />
    </ForcedTheme>
  );
}
