import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TodayPrescriptionCard } from "@/components/plans/TodayPrescriptionCard";

/**
 * Today tab (02 §6.1) — a composed screen this domain owns the layout of,
 * but doesn't fully design. Three stacked regions, top to bottom:
 *  1. Injury banner (Domain 05) — conditional, ranks above everything when
 *     active injuries touch today's specific session. No ready-made
 *     "today-scoped" banner component exists yet on this branch, so this is
 *     a clearly-named layout slot for that sibling domain to fill, not a
 *     built banner.
 *  2. Today's planned-session card (this domain) — TodayPrescriptionCard.
 *  3. Quick-log entry point (Domain 01) — always present, a real link to
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
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-5 py-6">
      <h1 className="font-mono text-lg font-bold text-[var(--text)]">
        $ fithub today
      </h1>

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
  );
}
