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
      className="hidden md:flex items-center gap-2 bg-[var(--accent)] text-[#0A0D12] font-bold text-[13px] px-4 py-[11px] rounded-[10px] hover:brightness-110 transition-all"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#0A0D12"
        strokeWidth="2.4"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
      New plan
    </Link>
  );

  return (
    <div className="mx-auto max-w-[1100px] px-[18px] pt-[14px] pb-2 md:px-4 md:py-8">
      <div className="md:hidden flex items-center gap-[9px] mb-[14px]">
        <Link
          href="/dashboard"
          className="flex text-[var(--muted)]"
          aria-label="Back to home"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <span className="font-data text-[11.5px] text-[var(--muted)]">
          Home
        </span>
      </div>
      <PageHeader
        gitCommand="$ git branch --list"
        title="Plans"
        sub="Each plan is a branch — commit sessions to it, merge it when you hit the goal."
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
        <div
          className="grid gap-[11px] md:gap-[14px] mt-4"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
          }}
        >
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
}
