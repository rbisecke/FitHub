import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { HistoryPage } from "@/components/workout/HistoryPage";

export default async function HistoryRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { items, next_cursor } = await api.workouts.list(
    session!.access_token,
    { limit: 20 },
  );

  return (
    <HistoryPage
      initialItems={items}
      initialNextCursor={next_cursor}
      accessToken={session!.access_token}
    />
  );
}
