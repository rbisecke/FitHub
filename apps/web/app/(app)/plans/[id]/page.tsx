import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { PlanBranchView } from "@/components/plans/PlanBranchView";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PlanDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  let plan: Awaited<ReturnType<typeof api.plans.get>> | null = null;
  try {
    plan = await api.plans.get(session.access_token, id);
  } catch {
    notFound();
  }
  if (!plan) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <p className="mb-1 select-none font-mono text-xs text-zinc-600">
        {plan.branch_name}
      </p>
      <h1 className="mb-1 font-mono text-xl font-bold text-zinc-100">
        {plan.title}
      </h1>
      <p className="mb-8 text-xs text-zinc-500">
        {plan.goal.replace("_", " ")} · {plan.weeks} weeks · starts{" "}
        {plan.start_date}
      </p>
      <PlanBranchView plan={plan} accessToken={session.access_token} />
    </div>
  );
}
