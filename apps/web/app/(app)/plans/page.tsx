import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import type { PlanSummary } from "@/lib/api/plans";
import { PageHeader } from "@/components/ui/page-header";
import { PlanCard } from "@/components/plans/PlanCard";

export default async function PlansPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const {
    data: { session },
  } = await supabase.auth.getSession();

  let plans: PlanSummary[] = [];
  try {
    plans = await api.plans.list(session!.access_token);
  } catch {
    // degrade gracefully
  }

  const action = (
    <Link
      href="/plans/new"
      className="bg-[var(--accent)] text-[#0d1117] font-data text-[13px] font-bold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
    >
      + new branch
    </Link>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        gitCommand="$ git branch --list 'meso/*'"
        title="Plans"
        sub="Your training programmes"
        action={action}
      />
      {plans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center mt-4">
          <p className="font-data text-[var(--muted)]">
            # no branches yet — create your first training plan
          </p>
          <p className="mt-2 font-data text-[12px] text-[var(--muted)]">
            git checkout -b plan/general-fitness-2026-07
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
}
