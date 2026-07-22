import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { IntegrationsListScreen } from "@/components/integrations/IntegrationsListScreen";

/**
 * Connected-sources list (07 §A). Light theme (Bible rule 1.1 — a settled
 * cross-cutting exception for integration settings), mirroring the
 * `/social/training-partners` route's server-fetch-then-pass pattern so the
 * list has data on first paint.
 */
export default async function IntegrationsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const token = session.access_token;

  let connections: Awaited<ReturnType<typeof api.integrations.list>> = [];
  let initialLoadFailed = false;
  try {
    connections = await api.integrations.list(token);
  } catch {
    initialLoadFailed = true;
  }

  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <IntegrationsListScreen
        token={token}
        initialConnections={connections}
        initialLoadFailed={initialLoadFailed}
      />
    </ForcedTheme>
  );
}
