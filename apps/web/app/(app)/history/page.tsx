import { requireAuth } from "@/lib/supabase/requireAuth";
import { api } from "@/lib/api/client";
import { HistoryPage } from "@/components/workout/HistoryPage";

export default async function HistoryRoute() {
  const { token } = await requireAuth();

  const { items, next_cursor } = await api.workouts.list(token, { limit: 20 });

  return (
    <HistoryPage
      initialItems={items}
      initialNextCursor={next_cursor}
      accessToken={token}
    />
  );
}
