import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";
import type { PersonalRecord, WorkoutSummary } from "@/lib/api";
import type { ReadinessResponse } from "@/lib/api";

import { prDelta } from "@/lib/dashboard/prDelta";

import { PageHeader } from "@/components/ui/page-header";
import { ContributionGraphRevamp } from "@/components/dashboard/ContributionGraphRevamp";
import { OnboardingToast } from "@/components/onboarding/OnboardingToast";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { TerminalWidget } from "@/components/dashboard/TerminalWidget";
import { RecentCommitsFeed } from "@/components/dashboard/RecentCommitsFeed";
import { OpenPRsWidget } from "@/components/dashboard/OpenPRsWidget";
import { CoachPreviewCard } from "@/components/dashboard/CoachPreviewCard";
import { QuickCommitWidget } from "@/components/dashboard/QuickCommitWidget";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const token = session.access_token;

  const [workoutRes, prRes, readinessRes, profileRes] =
    await Promise.allSettled([
      api.workouts.list(token, { limit: 365 }),
      api.analytics.personalRecords(token),
      api.analytics.readiness(token),
      api.profile.get(token),
    ]);

  const workouts: WorkoutSummary[] =
    workoutRes.status === "fulfilled" ? workoutRes.value.items : [];
  const prs: PersonalRecord[] = prRes.status === "fulfilled" ? prRes.value : [];
  const readiness: ReadinessResponse | null =
    readinessRes.status === "fulfilled" ? readinessRes.value : null;

  const showOnboardingToast =
    profileRes.status === "fulfilled" && !profileRes.value.onboarding_completed;

  // ── Stat grid data ────────────────────────────────────────────────────────
  const today = new Date().toLocaleDateString("en-CA");
  const hasWorkoutToday = workouts.some(
    (w) => new Date(w.performed_at).toLocaleDateString("en-CA") === today,
  );

  const tsbValue = readiness ? Math.round(readiness.tsb) : 0;
  const fitnessValue = readiness ? Math.round(readiness.score * 100) : 0;
  const acwrDisplay =
    readiness?.acwr != null ? Math.round(readiness.acwr * 100) : "—";

  const stats = [
    {
      label: "Status",
      value: hasWorkoutToday ? "Active" : "Day off",
      sub: new Date().toLocaleDateString("en-US", { weekday: "long" }),
    },
    {
      label: "Fitness",
      value: fitnessValue,
      sub: "readiness score",
    },
    {
      label: "Fatigue",
      value: acwrDisplay,
      sub: "acute workload ratio",
    },
    {
      label: "Form",
      value: tsbValue,
      sub: "training stress balance",
      valueColor: (tsbValue < 0 ? "hot" : "accent") as "hot" | "accent",
    },
  ];

  // ── Terminal widget commits ───────────────────────────────────────────────
  const terminalCommits = workouts.slice(0, 5).map((w) => ({
    hash: w.short_hash,
    message: w.title ?? (w.session_type ? w.session_type : "session"),
  }));

  // ── Recent commits feed ───────────────────────────────────────────────────
  const nowMs = new Date().getTime();
  const feedCommits = workouts.slice(0, 8).map((w) => {
    const diffMs = nowMs - new Date(w.performed_at).getTime();
    const diffD = Math.floor(diffMs / 86_400_000);
    const diffH = Math.round(diffMs / 3_600_000);
    const relTime = diffD >= 1 ? `${diffD}d ago` : `${diffH}h ago`;
    return {
      hash: w.short_hash,
      title: w.title ?? "Untitled session",
      sessionType: w.session_type ?? "mixed",
      relTime,
    };
  });

  // ── Open PRs widget ───────────────────────────────────────────────────────
  const recentPRs = prDelta(prs);
  const prItems = recentPRs.map((pr) => ({
    category: "PR",
    name: pr.movementName,
    value: Number.isInteger(pr.bestKg)
      ? `${pr.bestKg}kg`
      : `${pr.bestKg.toFixed(1)}kg`,
    improvement:
      pr.deltaKg != null && pr.deltaKg > 0 ? `▲ +${pr.deltaKg}kg` : undefined,
  }));

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="animate-fadeUp">
        <PageHeader gitCommand="$ git log --oneline" title="Dashboard" />
      </div>

      <div className="animate-fadeUp">
        <StatGrid stats={stats} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-[18px] animate-fadeUp">
        {/* Left column */}
        <div className="space-y-[18px]">
          <ContributionGraphRevamp workouts={workouts} />
          <TerminalWidget commits={terminalCommits} />
          <RecentCommitsFeed commits={feedCommits} />
        </div>

        {/* Right sidebar */}
        <div className="space-y-[18px]">
          <OpenPRsWidget prs={prItems} />
          <CoachPreviewCard />
          <QuickCommitWidget />
        </div>
      </div>

      {showOnboardingToast && <OnboardingToast />}
    </div>
  );
}
