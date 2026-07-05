import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/supabase/requireAuth";
import { api } from "@/lib/api/client";
import { WorkoutDetailClient } from "@/components/workout/WorkoutDetailClient";

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { token } = await requireAuth();

  let workout;
  try {
    workout = await api.workouts.get(token, id);
  } catch {
    notFound();
  }

  return <WorkoutDetailClient workout={workout} accessToken={token} />;
}
