import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import type { PlanDetail } from "@/lib/api/plans";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { ManualRevisionComposer } from "@/components/adaptations/ManualRevisionComposer";

/**
 * Manual plan revision route (design spec §9 — `$ git request-changes`).
 * Light theme (§9 — review/analysis moment, §1.1). Server Component: fetches
 * the token and current plan detail for first paint; the client composer
 * owns the feedback form, submission, and the applied-diff result.
 */
export default async function PlanRevisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { id: planId } = await params;
  const token = session.access_token;

  let initialPlanDetail: PlanDetail | null = null;
  try {
    initialPlanDetail = await api.plans.get(token, planId);
  } catch (err) {
    console.error(`revise page: failed to load plan ${planId}`, err);
  }

  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-8">
        <div>
          <Link
            href={`/plan/${planId}`}
            className="font-mono text-xs text-[var(--muted)] hover:text-[var(--text)]"
          >
            ← plan overview
          </Link>
          <h1 className="mt-2 font-sans text-xl font-bold text-[var(--text)]">
            Revise your plan
          </h1>
          <p className="mt-1 font-sans text-sm text-[var(--muted)]">
            Describe a change in plain language — FitHub applies it straight to
            your upcoming sessions. There&apos;s no review step, unlike an
            AI-proposed adaptation.
          </p>
        </div>
        <ManualRevisionComposer
          token={token}
          planId={planId}
          initialPlanDetail={initialPlanDetail}
        />
      </div>
    </ForcedTheme>
  );
}
