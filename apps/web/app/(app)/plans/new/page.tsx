import { requireAuth } from "@/lib/supabase/requireAuth";
import { CreatePlanWizard } from "@/components/plans/CreatePlanWizard";

export default async function NewPlanPage() {
  const { token } = await requireAuth();

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-1 font-mono text-xl font-bold text-[var(--text)]">
        $ git checkout -b plan/...
      </h1>
      <p className="mb-8 font-mono text-xs text-[var(--muted)]">
        # generate a new training plan
      </p>
      <CreatePlanWizard accessToken={token} />
    </div>
  );
}
