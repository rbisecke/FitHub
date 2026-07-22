import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { CostDashboard } from "@/components/admin/CostDashboard";

/**
 * Cost / usage dashboard (`08` §7) — the one **light** admin surface (theme
 * map, `08` §4). The dark infra strip/nav chrome above it (owned by
 * `AdminLayout`) is unaffected; only this page's own body opts into light by
 * wrapping itself in `ForcedTheme`, mirroring the `/profile` page's pattern.
 *
 * Fetched server-side (mirrors `/profile`'s pattern) since the whole page is
 * a read-once report with no client-side interactivity — there's no
 * per-source/per-model breakdown toggle to wire (the mandated
 * `MetricsSummary` shape has no such field to opt into).
 */
export default async function AdminCostPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const token = session.access_token;

  let metrics;
  try {
    metrics = await api.admin.metrics(token);
  } catch {
    metrics = null;
  }

  return (
    <ForcedTheme
      theme="light"
      className="min-h-full bg-background text-foreground"
    >
      {metrics ? (
        <CostDashboard metrics={metrics} />
      ) : (
        <div className="mx-auto max-w-5xl p-6">
          <p className="font-mono text-sm text-[var(--muted)]">
            Couldn&apos;t load cost data. Try refreshing the page.
          </p>
        </div>
      )}
    </ForcedTheme>
  );
}
