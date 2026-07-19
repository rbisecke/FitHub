import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreatePlanWizard } from "@/components/plans/CreatePlanWizard";

/**
 * Plan generation wizard route (02 §2). Dark — glanceable, forward-momentum,
 * pre-analysis (§1.1). CreatePlanWizard owns step routing internally and
 * swaps itself out for the async generation state (§3) on submit.
 */
export default async function NewPlanPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col gap-8 px-5 py-10 md:py-14">
      <div>
        <h1 className="font-mono text-2xl font-bold text-[var(--accent)]">
          $ git checkout -b plan/new
        </h1>
        <p className="mt-1 font-mono text-sm text-[var(--muted)]">
          A few questions, then FitHub scaffolds a periodized plan around them.
        </p>
      </div>
      <CreatePlanWizard accessToken={session.access_token} />
    </div>
  );
}
