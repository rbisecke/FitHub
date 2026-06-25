import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import type { PersonalRecord, E1RMPoint } from "@/lib/api";
import { RecordsShell } from "@/components/records/RecordsShell";

export const metadata = { title: "Records · FitHub" };

export default async function RecordsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const token = session.access_token;

  const prs = await api.analytics
    .personalRecords(token)
    .catch((): PersonalRecord[] => []);

  const trendPromises = prs.map((pr) =>
    api.analytics
      .movementTrend(token, pr.movement_id)
      .catch((): E1RMPoint[] => []),
  );
  const trends = await Promise.all(trendPromises);

  const trendMap: Record<string, E1RMPoint[]> = {};
  prs.forEach((pr, i) => {
    trendMap[pr.movement_id] = trends[i] ?? [];
  });

  const now = new Date();
  const recentPRIds = prs
    .filter((pr) => {
      const d = new Date(pr.achieved_at);
      return now.getTime() - d.getTime() < 24 * 60 * 60 * 1000;
    })
    .map((pr) => pr.movement_id);

  return (
    <RecordsShell prs={prs} trendMap={trendMap} recentPRIds={recentPRIds} />
  );
}
