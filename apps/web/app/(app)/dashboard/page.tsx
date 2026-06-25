import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";
import type {
  PersonalRecord,
  TrainingPartner,
  WorkoutSummary,
} from "@/lib/api";
import type { ReadinessResponse } from "@/lib/api";

import { readinessSentence } from "@/lib/dashboard/readinessSentence";
import { streakCalc } from "@/lib/dashboard/streakCalc";
import { prDelta } from "@/lib/dashboard/prDelta";

import { HeroBlock } from "@/components/dashboard/HeroBlock";
import { StreakWidget } from "@/components/dashboard/StreakWidget";
import { WeekMiniGraph } from "@/components/dashboard/WeekMiniGraph";
import { ContributionGraphRevamp } from "@/components/dashboard/ContributionGraphRevamp";
import { RecentPRsStrip } from "@/components/dashboard/RecentPRsStrip";
import { TrainingPartnersSummary } from "@/components/dashboard/TrainingPartnersSummary";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ pr?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const token = session.access_token;

  const [workoutRes, partnersRes, prRes, readinessRes] =
    await Promise.allSettled([
      api.workouts.list(token, { limit: 365 }),
      api.trainingPartners(token),
      api.analytics.personalRecords(token),
      api.analytics.readiness(token),
    ]);

  const workouts: WorkoutSummary[] =
    workoutRes.status === "fulfilled" ? workoutRes.value.items : [];
  const partners: TrainingPartner[] =
    partnersRes.status === "fulfilled" ? partnersRes.value : [];
  const prs: PersonalRecord[] = prRes.status === "fulfilled" ? prRes.value : [];
  const readiness: ReadinessResponse | null =
    readinessRes.status === "fulfilled" ? readinessRes.value : null;

  const streak = streakCalc(workouts);
  const sentence = readinessSentence(readiness, streak.isComeback);
  const readinessLabel = readiness?.label ?? "unknown";
  const recentPRs = prDelta(prs);

  const params = await searchParams;
  const isNewPR = params.pr === "1";

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <p className="font-mono text-xs text-[--muted] mb-1">$ fithub status</p>
        <h1 className="text-2xl font-bold text-[--text]">Dashboard</h1>
      </header>

      <HeroBlock
        sentence={sentence}
        readinessLabel={readinessLabel}
        isComeback={streak.isComeback}
      />

      {/* Mobile: stack vertically. Desktop (lg:): two-column grid */}
      <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-6">
        {/* Left column — streak, week, partners */}
        <aside className="flex flex-col gap-3 mb-6 lg:mb-0">
          {/* Mobile: streak + week side-by-side */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <StreakWidget streak={streak} />
            <WeekMiniGraph
              workouts={workouts}
              frequencyTarget={streak.frequencyTarget}
            />
          </div>

          {partners.length > 0 && (
            <div className="hidden md:block">
              <TrainingPartnersSummary partners={partners} />
            </div>
          )}
        </aside>

        {/* Right column — contribution graph */}
        <section>
          <ContributionGraphRevamp workouts={workouts} />
        </section>
      </div>

      {/* Recent PRs — full width below the grid */}
      <RecentPRsStrip prs={recentPRs} isNewPR={isNewPR} />

      {/* Training partners on mobile (low priority, after PRs) */}
      {partners.length > 0 && (
        <div className="mt-4 md:hidden">
          <TrainingPartnersSummary partners={partners} />
        </div>
      )}
    </div>
  );
}
