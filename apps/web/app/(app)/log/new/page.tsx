import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkoutForm } from "@/components/workout/WorkoutForm";
import type { components } from "@/lib/api/generated";

type ParsedEntry = components["schemas"]["ParsedLogEntry"];
type FormResultType =
  | "weight"
  | "reps"
  | "time"
  | "distance"
  | "calories"
  | "height"
  | "rounds_reps"
  | "pace"
  | "watts";

const RESULT_TYPE_MAP: Record<string, FormResultType> = {
  weight_kg: "weight",
  time_s: "time",
  distance_m: "distance",
  rounds: "rounds_reps",
  reps: "reps",
  calories: "calories",
};

function parsedToInitialValues(parsed: ParsedEntry) {
  return {
    title: parsed.title ?? undefined,
    session_type:
      parsed.session_type !== "unknown" ? parsed.session_type : undefined,
    workout_format: parsed.workout_format ?? undefined,
    session_rpe: parsed.session_rpe ?? undefined,
    duration_min:
      parsed.duration_s != null
        ? Math.round(parsed.duration_s / 60)
        : undefined,
    results: parsed.results.map((r) => ({
      movement_name: r.movement_name,
      result_type: RESULT_TYPE_MAP[r.result_type] ?? "reps",
      load_kg: r.load_kg != null ? String(r.load_kg) : undefined,
      reps: r.reps ?? undefined,
      time_s: r.time_s ?? undefined,
      notes: r.notes ?? undefined,
    })),
  };
}

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

  const { prefill } = await searchParams;
  let initialValues: ReturnType<typeof parsedToInitialValues> | undefined;
  if (prefill) {
    try {
      const parsed = JSON.parse(prefill) as ParsedEntry;
      initialValues = parsedToInitialValues(parsed);
    } catch {
      // ignore malformed prefill
    }
  }

  return (
    <WorkoutForm
      accessToken={session!.access_token}
      initialValues={initialValues}
    />
  );
}
