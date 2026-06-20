import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";
import { ContributionGraph } from "@/components/workout/ContributionGraph";
import { ACWRWidget } from "@/components/analytics/ACWRWidget";
import { TrainingPartnersPanel } from "@/components/analytics/TrainingPartnersPanel";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");
  const user = session.user;

  const token = session.access_token;

  // Fetch in parallel — each degrades gracefully on error
  let workouts: Awaited<ReturnType<typeof api.workouts.list>>["items"] = [];
  let loadData: Awaited<ReturnType<typeof api.analytics.load>> | null = null;
  let partners: Awaited<ReturnType<typeof api.trainingPartners>> = [];

  const [workoutRes, loadRes, partnersRes] = await Promise.allSettled([
    api.workouts.list(token, { limit: 365 }),
    api.analytics.load(token, 14),
    api.trainingPartners(token),
  ]);
  if (workoutRes.status === "fulfilled") workouts = workoutRes.value.items;
  if (loadRes.status === "fulfilled") loadData = loadRes.value;
  if (partnersRes.status === "fulfilled") partners = partnersRes.value;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="font-mono text-xs text-zinc-500 mb-1">$ fithub status</p>
        <h1 className="text-2xl font-bold text-zinc-50">Dashboard</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Signed in as{" "}
          <span className="text-zinc-200 font-mono">{user.email}</span>
        </p>
      </div>

      {/* Contribution graph */}
      <div className="mb-8 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <p className="font-mono text-xs text-zinc-500 mb-3">
          contributions in the last year
        </p>
        <ContributionGraph workouts={workouts} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
        <Link
          href="/log/new"
          className="group rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-4 hover:border-zinc-700 transition-colors"
        >
          <p className="font-mono text-xs text-zinc-500 mb-1">$ git commit</p>
          <p className="font-semibold text-zinc-100 group-hover:text-white">
            Log a workout
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Record today&apos;s training session
          </p>
        </Link>

        <Link
          href="/history"
          className="group rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-4 hover:border-zinc-700 transition-colors"
        >
          <p className="font-mono text-xs text-zinc-500 mb-1">$ git log</p>
          <p className="font-semibold text-zinc-100 group-hover:text-white">
            Workout history
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {workouts.length} commit{workouts.length !== 1 ? "s" : ""} logged
          </p>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {loadData && (
          <ACWRWidget
            series={loadData.series}
            acwrNow={loadData.acwr_now}
            acwrZone={loadData.acwr_zone}
          />
        )}
        <TrainingPartnersPanel partners={partners} />
      </div>
    </div>
  );
}
