import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreatePlanForm } from "@/components/plans/CreatePlanForm";

export default async function NewPlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-1 font-mono text-xl font-bold text-zinc-100">
        $ git checkout -b plan/...
      </h1>
      <p className="mb-8 font-mono text-xs text-zinc-500">
        # generate a new training plan
      </p>
      <CreatePlanForm accessToken={session!.access_token} />
    </div>
  );
}
