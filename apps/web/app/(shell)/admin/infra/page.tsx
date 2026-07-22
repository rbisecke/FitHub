import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { HealthPanel } from "@/components/admin/HealthPanel";
import { InfraPanel } from "@/components/admin/InfraPanel";
import type { AdminHealth, AdminInfraDashboard } from "@/lib/api";

const EMPTY_INFRA_DASHBOARD: AdminInfraDashboard = {
  current: [],
  history: {},
  recent_deployments: [],
};

function formatAsOf(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Infra health monitoring route (`08` §8) — the full dashboard the pinned
 * status strip (§4, `InfraStatusStrip`) links out to via "view detail".
 *
 * Server Component: fetches both feeds (`GET /admin/health`, `GET
 * /admin/infra`) once for first paint, the same fetch-once-and-hand-to-a-
 * presentational-panel pattern every other admin/analytics route in this
 * app uses (e.g. `/progress/load`, `/progress/benchmarks`) — no client-side
 * polling. That matches this page's resolved liveness cue: a static "as of
 * {timestamp}" readout, not a live-refresh indicator (08 §8 Interactions,
 * RESOLVED 2026-07-18) — this is a low-traffic, read-once operator surface,
 * not a continuously-watched ops dashboard, so websocket/polling
 * infrastructure isn't justified.
 *
 * The two feeds are fetched in parallel and degrade independently:
 * - A failed `/admin/health` call hides that zone behind an honest notice
 *   instead of crashing the whole page.
 * - A failed `/admin/infra` call falls back to an empty dashboard, which
 *   `InfraPanel` already renders as the "unknown collector" state (08 §8
 *   States) — every source shows "unknown", a normal degraded state, not an
 *   error UI.
 */
export default async function AdminInfraPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const token = session.access_token;

  const [healthResult, infraResult] = await Promise.allSettled([
    api.admin.health(token),
    api.admin.infra(token),
  ]);

  const health: AdminHealth | null =
    healthResult.status === "fulfilled" ? healthResult.value : null;
  const dashboard: AdminInfraDashboard =
    infraResult.status === "fulfilled"
      ? infraResult.value
      : EMPTY_INFRA_DASHBOARD;

  const asOf = formatAsOf(new Date());

  return (
    <div className="mx-auto max-w-[1180px] px-6 py-7 pb-16">
      <header className="mb-7">
        <h1
          className="m-0 text-[20px] font-bold text-[var(--text)]"
          style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}
        >
          Infra health
        </h1>
        <p
          className="mt-1 text-[12px] text-[var(--muted)]"
          style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}
        >
          System health + Supabase / Railway / Vercel detail — as of {asOf}
        </p>
      </header>

      <section className="mb-14">
        <ZoneHeading eyebrow="Zone A">System health</ZoneHeading>
        {health ? (
          <HealthPanel health={health} />
        ) : (
          <div
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-11 text-center text-[13px] text-[var(--muted)]"
            style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}
          >
            System health data is currently unavailable.
          </div>
        )}
      </section>

      <section>
        <ZoneHeading eyebrow="Zone B">Infrastructure</ZoneHeading>
        <InfraPanel dashboard={dashboard} />
      </section>
    </div>
  );
}

// A stronger differentiator between the page's two zones than a plain
// caption line — an uppercase eyebrow label plus a full-width rule under
// the heading, so the eye can jump between "system health" and
// "infrastructure" while scrolling a long dashboard (UI critique
// 2026-07-22).
function ZoneHeading({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="mb-5 border-b border-[var(--border)] pb-3"
      style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}
    >
      <div className="text-[10.5px] uppercase tracking-[0.5px] text-[var(--muted)]">
        {eyebrow}
      </div>
      <h2 className="mt-1 text-[16px] font-bold text-[var(--text)]">
        {children}
      </h2>
    </div>
  );
}
