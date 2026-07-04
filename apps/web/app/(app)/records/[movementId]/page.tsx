import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import type {
  PersonalRecord,
  E1RMPoint,
  MovementHistoryEntry,
} from "@/lib/api";
import { categorise } from "@/lib/records/categorise";
import { MovementDetailShell } from "@/components/records/MovementDetailShell";

export const metadata = { title: "Movement Detail · FitHub" };

export default async function MovementDetailPage({
  params,
}: {
  params: Promise<{ movementId: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { movementId } = await params;
  const token = session.access_token;

  const [prs, trendPoints, history] = await Promise.all([
    api.analytics.personalRecords(token).catch((): PersonalRecord[] => []),
    api.analytics.movementTrend(token, movementId).catch((): E1RMPoint[] => []),
    api.analytics
      .movementHistory(token, movementId)
      .catch((): MovementHistoryEntry[] => []),
  ]);

  const pr = prs.find((p) => p.movement_id === movementId);
  if (!pr) notFound();

  const category = categorise(pr.movement_name);

  return (
    <MovementDetailShell
      pr={pr}
      category={category}
      trendPoints={trendPoints}
      history={history}
    />
  );
}
