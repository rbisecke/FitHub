import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { WorkoutCard } from "@/components/workout/WorkoutCard";
import { HistoryControls } from "@/components/workout/HistoryControls";
import { relativeDate } from "@/lib/display";
import Link from "next/link";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string; filter?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const { cursor, filter } = await searchParams;

  const { items, next_cursor } = await api.workouts.list(
    session!.access_token,
    { beforeId: cursor, limit: 20 },
  );

  // Client-side filter for partner/solo (MVP — no API param yet)
  const filtered =
    filter === "partner"
      ? items.filter(
          (w) => w.workout_format === "partner" || w.workout_format === "team",
        )
      : filter === "solo"
        ? items.filter(
            (w) =>
              w.workout_format !== "partner" && w.workout_format !== "team",
          )
        : items;

  // Group consecutive workouts by their UTC date so we can render date headers
  // and suppress the per-card date label within each group.
  type WorkoutGroup = {
    date: string;
    label: string;
    workouts: typeof filtered;
  };
  const groups: WorkoutGroup[] = [];
  let lastDate = "";
  for (const w of filtered) {
    const date = w.performed_at.slice(0, 10);
    if (date !== lastDate) {
      groups.push({ date, label: relativeDate(date), workouts: [w] });
      lastDate = date;
    } else {
      groups[groups.length - 1]!.workouts.push(w);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">
          <span className="font-mono text-zinc-500 mr-2 text-sm">$</span>
          git log
        </h1>
        <HistoryControls />
      </div>

      {filtered.length === 0 ? (
        <p className="font-mono text-sm text-zinc-500 text-center py-16">
          No commits yet.{" "}
          <Link href="/log/new" className="text-zinc-300 hover:text-zinc-100">
            git commit --fit
          </Link>
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.date}>
              <p className="text-xs text-zinc-500 font-mono mb-2">
                {group.label}
              </p>
              <div className="space-y-3">
                {group.workouts.map((w) => (
                  <WorkoutCard key={w.id} workout={w} hideDate />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {next_cursor && filter !== "partner" && filter !== "solo" && (
        <Link
          href={`/history?cursor=${next_cursor}`}
          className="mt-6 block text-center text-sm text-zinc-400 hover:text-zinc-200"
        >
          Load older commits ↓
        </Link>
      )}
    </div>
  );
}
