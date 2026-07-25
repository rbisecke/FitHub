import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { TodayPrescriptionCard } from "@/components/plans/TodayPrescriptionCard";
import { ReadinessSection } from "@/components/analytics/readiness/ReadinessSection";
import { StreakCard } from "@/components/dashboard/StreakCard";
import { GamificationMount } from "@/components/gamification/GamificationMount";

/**
 * Today tab (02 §6.1) — a composed screen this domain owns the layout of,
 * but doesn't fully design. Stacked regions, top to bottom:
 *  1. Readiness score arc (Domain 04, Screen 5A) — the domain's Navigation
 *     table names this as the readiness surface's entry point ("Screen 5
 *     ... reached from the readiness surface / Domain 05, not from a
 *     Progress segment"); no other reachable surface existed for it, so it
 *     lands here, above the injury banner, as the day's first glance.
 *  2. Injury banner (Domain 05) — conditional, ranks above the plan itself
 *     when active injuries touch today's specific session. No ready-made
 *     "today-scoped" banner component exists yet on this branch, so this is
 *     a clearly-named layout slot for that sibling domain to fill, not a
 *     built banner.
 *  3. Today's planned-session card (Domain 02) — TodayPrescriptionCard.
 *  4. Quick-log entry point (Domain 01) — always present, a real link to
 *     the existing `/log/new` route (not a stub), regardless of whether
 *     today has a planned session or is a rest day.
 * Dark — glanceable check-in (§1.1).
 */
export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  return (
    <ForcedTheme
      theme="dark"
      className="min-h-svh bg-background text-foreground"
    >
      <div className="pb-nav-safe-fab mx-auto flex max-w-2xl flex-col gap-4 px-5 pt-6 md:pb-6">
        <h1 className="font-mono text-lg font-bold text-[var(--text)]">
          $ fithub today
        </h1>

        {/* Streak-freeze reveal + milestone toast (Domain 07 §F/§H) — renders
            nothing unless a real unread gamification event is waiting. */}
        <GamificationMount accessToken={session.access_token} />

        {/* Canonical streak display (Domain 07 §D) — the everyday glanceable
            surface (distinct from the above one-time reveal moment). */}
        <StreakCard accessToken={session.access_token} />

        <ReadinessSection accessToken={session.access_token} />

        {/* Injury banner slot (Domain 05) — intentionally empty here. */}
        <div data-testid="today-injury-banner-slot" />

        <TodayPrescriptionCard accessToken={session.access_token} />

        <Link
          href="/log/new"
          className="rounded-lg border p-4 text-center font-mono text-sm transition-colors"
          style={{
            borderColor: "var(--border)",
            color: "var(--muted)",
            minHeight: "44px",
          }}
        >
          + log something outside the plan
        </Link>
      </div>
    </ForcedTheme>
  );
}
