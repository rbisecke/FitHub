import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { BenchmarkHistoryScreen } from "@/components/benchmarks/BenchmarkHistoryScreen";
import type { BenchmarkResponse } from "@/lib/api";

/**
 * Benchmark History route (design-spec 04 Screen 3, "Benchmarks" Progress-tab
 * segment). Forced dark regardless of OS theme — a glance-and-celebrate
 * surface (Bible 1.1), not the seated-analysis theme used by the structurally
 * similar Movement Detail screen. Server Component: fetches the token and the
 * first page of benchmarks for first paint; the client screen owns the
 * client-side retry path if this initial fetch fails.
 */
export default async function BenchmarksPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const token = session.access_token;

  let initialData: BenchmarkResponse | null = null;
  let initialLoadFailed = false;
  try {
    initialData = await api.analytics.benchmarks(token);
  } catch {
    initialLoadFailed = true;
  }

  return (
    <ForcedTheme theme="dark" className="min-h-svh">
      <BenchmarkHistoryScreen
        token={token}
        initialData={initialData}
        initialLoadFailed={initialLoadFailed}
      />
    </ForcedTheme>
  );
}
