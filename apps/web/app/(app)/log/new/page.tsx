import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogPageClient } from "@/components/log/LogPageClient";
import { api } from "@/lib/api/client";
import type { WorkoutSummary } from "@/lib/api";

export default async function NewWorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ prefill?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session!.access_token;
  const { prefill } = await searchParams;

  // Fetch recent workouts for the template picker
  let recentWorkouts: WorkoutSummary[] = [];
  try {
    const resp = await api.workouts.list(token, { limit: 3 });
    recentWorkouts = resp.items;
  } catch {
    // non-fatal — template picker will be empty
  }

  // Parse NL prefill if present (legacy flow from NLLogInput on /coach)
  let prefillValues: Parameters<typeof LogPageClient>[0]["prefillValues"];
  if (prefill) {
    try {
      // prefill is a JSON-encoded ParsedLogEntry from the old NLLogInput flow
      const parsed = JSON.parse(prefill) as {
        title?: string | null;
        session_type?: string | null;
        results?: Array<{
          movement_name: string;
          result_type: string;
          load_kg?: number | null;
          reps?: number | null;
          time_s?: number | null;
        }>;
      };
      prefillValues = {
        title: parsed.title ?? undefined,
        session_type: parsed.session_type ?? undefined,
        results: (parsed.results ?? []).map((r, i) => ({
          movement_name: r.movement_name,
          result_type: "weight" as const,
          load_kg: r.load_kg != null ? String(r.load_kg) : "",
          reps: r.reps != null ? String(r.reps) : "",
          time_text:
            r.time_s != null
              ? `${Math.floor(r.time_s / 60)}:${String(r.time_s % 60).padStart(
                  2,
                  "0",
                )}`
              : "",
          distance_m: "",
          rounds: "",
          partial_reps: "",
          calories: "",
          height_cm: "",
          watts: "",
          pace_text: "",
          order_index: i,
        })),
      };
    } catch {
      // ignore malformed prefill
    }
  }

  return (
    <LogPageClient
      accessToken={token}
      recentWorkouts={recentWorkouts}
      prefillValues={prefillValues}
      isFirstWorkout={recentWorkouts.length === 0}
    />
  );
}
