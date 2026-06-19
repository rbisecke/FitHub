import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";
import { ContributionGraph } from "@/components/workout/ContributionGraph";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user, session },
  } = await supabase.auth.getUser().then(async (u) => {
    const s = await supabase.auth.getSession();
    return { data: { user: u.data.user, session: s.data.session } };
  });

  if (!user || !session) redirect("/login");

  // Fetch last 365 days of workouts for the contribution graph (limit=365)
  let workouts: Awaited<ReturnType<typeof api.workouts.list>>["items"] = [];
  try {
    const res = await api.workouts.list(session.access_token, { limit: 365 });
    workouts = res.items;
  } catch {
    // Contribution graph degrades gracefully if API is down
  }

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
    </div>
  );
}
