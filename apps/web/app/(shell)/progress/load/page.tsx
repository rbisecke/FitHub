import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { LoadModelScreen } from "@/components/load-model/LoadModelScreen";
import type { LoadModelResponse } from "@/lib/api";

/**
 * Load Model Dashboard route (design-spec 04 Screen 4, "Load" Progress-tab
 * segment). Forced light regardless of OS theme — a seated multi-series
 * analysis surface (Bible 1.1), the same theme rule as every other
 * line-reading analytics screen in this domain. Server Component: fetches
 * the token and the default 90-day window for first paint; the client
 * screen owns window-control refetches and the client-side retry path.
 */
export default async function LoadPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const token = session.access_token;

  let initialData: LoadModelResponse | null = null;
  let initialLoadFailed = false;
  try {
    initialData = await api.analytics.load(token, 90);
  } catch {
    initialLoadFailed = true;
  }

  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <LoadModelScreen
        token={token}
        initialData={initialData}
        initialLoadFailed={initialLoadFailed}
      />
    </ForcedTheme>
  );
}
