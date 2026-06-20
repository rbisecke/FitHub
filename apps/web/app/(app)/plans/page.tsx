import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import type { PlanSummary } from "@/lib/api/plans";

export default async function PlansPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  let plans: PlanSummary[] = [];
  try {
    plans = await api.plans.list(session.access_token);
  } catch {
    // degrade gracefully
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 font-mono text-xl font-bold text-zinc-100">
        $ git branch --list
      </h1>
      <p className="mb-8 font-mono text-xs text-zinc-500">
        # your training plans — each plan is a branch
      </p>

      <div className="mb-6 flex justify-end">
        <Link
          href="/plans/new"
          className="rounded bg-indigo-700 px-4 py-2 font-mono text-sm text-white hover:bg-indigo-600"
        >
          + new branch
        </Link>
      </div>

      {plans.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-700 p-10 text-center">
          <p className="font-mono text-zinc-500">
            # no branches yet — create your first training plan
          </p>
          <p className="mt-2 font-mono text-xs text-zinc-600">
            git checkout -b plan/general-fitness-2026-07
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {plans.map((plan) => (
            <li key={plan.id} data-testid="plan-card">
              <Link
                href={`/plans/${plan.id}`}
                className="block rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-zinc-500">
                    {plan.branch_name}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 font-mono text-xs ${
                      plan.status === "active"
                        ? "bg-green-900 text-green-300"
                        : "bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    {plan.status}
                  </span>
                </div>
                <p className="mt-1 font-semibold text-zinc-100">{plan.title}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
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
