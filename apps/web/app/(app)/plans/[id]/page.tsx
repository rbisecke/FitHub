import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import Link from "next/link";
import { PlanBranchView } from "@/components/plans/PlanBranchView";
import { MesocycleDotGrid } from "@/components/plans/MesocycleDotGrid";
import { CurrentWeekView } from "@/components/plans/CurrentWeekView";
import { AIAdaptationsPanel } from "@/components/plans/AIAdaptationsPanel";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PlanDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session!.access_token;

  let plan: Awaited<ReturnType<typeof api.plans.get>> | null = null;
  try {
    plan = await api.plans.get(token, id);
  } catch {
    notFound();
  }
  if (!plan) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 flex flex-col gap-6">
      <div>
        <Link
          href="/plans"
          className="font-data text-[12px] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          ← back to plans
        </Link>
      </div>

      {/* Header */}
      <div className="animate-fadeUp">
        <p className="font-data text-[13px] text-[var(--blue)] mb-1">
          {plan.branch_name}
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-heading text-[28px] text-[var(--foreground)] m-0">
            {plan.title}
          </h1>
          {plan.status === "active" && (
            <span className="text-[10px] font-bold text-[var(--accent)] bg-[rgba(74,222,128,0.12)] border border-[rgba(74,222,128,0.3)] px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
        </div>
        <p className="font-data text-[12px] text-[var(--muted)] mt-1 tabular-nums">
          {plan.goal.replace(/_/g, " ")} · {plan.weeks} weeks · starts{" "}
          {plan.start_date}
        </p>
      </div>

      {/* Mesocycle dot grid */}
      {plan.sessions.length > 0 ? (
        <MesocycleDotGrid
          mesocycles={plan.mesocycles}
          sessions={plan.sessions}
          startDate={plan.start_date}
          weeks={plan.weeks}
        />
      ) : (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 text-center">
          <p className="font-data text-[13px] text-[var(--muted)]">
            # generating sessions...
          </p>
        </div>
      )}

      {/* Current week */}
      <CurrentWeekView sessions={plan.sessions} />

      {/* Plan revision / adaptations form */}
      <PlanBranchView plan={plan} accessToken={token} />

      {/* AI adaptations stub */}
      <AIAdaptationsPanel />
    </div>
  );
}
