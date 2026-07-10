import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/supabase/requireAuth";
import { api } from "@/lib/api/client";
import { SessionExecutionView } from "@/components/session/SessionExecutionView";

interface Props {
  params: Promise<{ id: string; sessionId: string }>;
}

export default async function SessionExecutePage({ params }: Props) {
  const { id: planId, sessionId } = await params;
  const { token } = await requireAuth();

  let plan: Awaited<ReturnType<typeof api.plans.get>> | null = null;
  try {
    plan = await api.plans.get(token, planId);
  } catch {
    notFound();
  }
  if (!plan) notFound();

  const session = plan.sessions.find((s) => s.id === sessionId);
  if (!session) notFound();

  return (
    <SessionExecutionView
      session={session}
      plan={{ id: plan.id, archetype: plan.archetype, title: plan.title }}
      accessToken={token}
    />
  );
}
