import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import type { PlanSummary } from "@/lib/api/plans";

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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 font-mono text-xl font-bold text-[--text]">
        $ git branch --list
      </h1>
      <p className="mb-8 font-mono text-xs text-[--muted]">
        # your training plans — each plan is a branch
      </p>

      <div className="mb-6 flex justify-end">
        <Link
          href="/plans/new"
          className="rounded-md bg-primary px-4 py-2 font-mono text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          + new branch
        </Link>
      </div>

      {plans.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[--border] p-10 text-center">
          <p className="font-mono text-[--muted]">
            # no branches yet — create your first training plan
          </p>
          <p className="mt-2 font-mono text-xs text-[--muted]">
            git checkout -b plan/general-fitness-2026-07
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {plans.map((plan) => (
            <li key={plan.id} data-testid="plan-card">
              <Link
                href={`/plans/${plan.id}`}
                className="block rounded-lg border border-[--border] bg-[--surface] p-4 transition-colors hover:border-[--accent]/50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[--muted]">
                    {plan.branch_name}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 font-mono text-xs ${
                      plan.status === "active"
                        ? "bg-[--green]/15 text-[--green]"
                        : "bg-[--surface-2] text-[--muted]"
                    }`}
                  >
                    {plan.status}
                  </span>
                </div>
                <p className="mt-1 font-semibold text-[--text]">{plan.title}</p>
                <p className="mt-0.5 font-mono text-xs text-[--muted] tabular-nums">
                  {plan.goal.replace("_", " ")} · {plan.weeks}w ·{" "}
                  {plan.start_date}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
