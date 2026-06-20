import { createClient } from "@/lib/supabase/server";
import { WorkoutForm } from "@/components/workout/WorkoutForm";

export default async function NewWorkoutPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return <WorkoutForm accessToken={session!.access_token} />;
}
