import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { WorkoutDetailClient } from "@/components/workout/WorkoutDetailClient";

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const {
    data: { session },
  } = await supabase.auth.getSession();

  let workout;
  try {
    workout = await api.workouts.get(session!.access_token, id);
  } catch {
    notFound();
  }

  return (
    <WorkoutDetailClient
      workout={workout}
      accessToken={session!.access_token}
    />
  );
}
