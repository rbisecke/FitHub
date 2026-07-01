import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";
import type { PersonalRecord, WorkoutSummary } from "@/lib/api";
import type { ReadinessResponse } from "@/lib/api";

import { prGoals } from "@/lib/dashboard/prDelta";
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

  const profile = profileRes.status === "fulfilled" ? profileRes.value : null;
  const firstName = profile?.display_name?.split(" ")[0] ?? "there";
  const terminalHandle = profile?.display_name
    ? profile.display_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    : (session.user.email ?? "user").split("@")[0] ?? "user";

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
  const oneWeekAgo = new Date(nowMs - 7 * 86_400_000);
  const weekCount = workouts.filter(
    (w) => new Date(w.performed_at) >= oneWeekAgo,
  ).length;
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

  // ── Open PRs widget (goals-in-progress) ──────────────────────────────────
  const goals = prGoals(prs);

  // ── Greeting streak count (simple day-based, 30-day window) ──────────────
  const recentStreak = workouts.filter((w) => {
    const diffD = Math.floor(
      (nowMs - new Date(w.performed_at).getTime()) / 86_400_000,
    );
    return diffD < 30;
  }).length;
  const currentStreak = recentStreak > 0 ? Math.min(recentStreak, 30) : 0;

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="mb-6 animate-fadeUp">
        <p className="font-data text-[11px] text-[var(--muted)] mb-1">
          $ fithub status
        </p>
        <h1 className="font-heading text-[26px] text-[var(--text)] tracking-[-0.03em] leading-tight">
          Good to see you, {firstName}.
        </h1>
        <p className="text-[13px] text-[var(--muted)] mt-1">
          {hasWorkoutToday ? "You trained today." : "Rest day."}{" "}
          {currentStreak > 0 && `${currentStreak}-day streak active.`}
        </p>
      </div>

      <div className="animate-fadeUp">
        <StatGrid stats={stats} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-[18px] animate-fadeUp">
        {/* Left column */}
        <div className="space-y-[18px]">
          <ContributionGraphRevamp workouts={workouts} />
          <TerminalWidget handle={terminalHandle} commits={terminalCommits} />
          <RecentCommitsFeed commits={feedCommits} weekCount={weekCount} />
        </div>

        {/* Right sidebar */}
        <div className="space-y-[18px]">
          <OpenPRsWidget goals={goals} />
          <CoachPreviewCard />
          <QuickCommitWidget />
        </div>
      </div>

      {showOnboardingToast && <OnboardingToast />}
    </div>
  );
}
