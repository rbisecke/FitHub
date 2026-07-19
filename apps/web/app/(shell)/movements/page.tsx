import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { MovementCatalog } from "@/components/logging/catalog/MovementCatalog";

/**
 * Movement catalog route (01 §8) — search, browse, and add custom movements.
 * Light regardless of app theme (Bible 1.1). Server Component fetches the token
 * and the initial official-first browse list for first paint.
 */
export default async function MovementsRoute() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  const token = session.access_token;

  let initialResults: Awaited<ReturnType<typeof api.movements.search>> = [];
  try {
    initialResults = await api.movements.search(token, { limit: 40 });
  } catch {
    // The client catalog shows a retry affordance on an empty first paint.
  }

  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <MovementCatalog token={token} initialResults={initialResults} />
    </ForcedTheme>
  );
}
