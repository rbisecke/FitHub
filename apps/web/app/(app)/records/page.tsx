import { requireAuth } from "@/lib/supabase/requireAuth";
import { api } from "@/lib/api/client";
import type { PersonalRecord, E1RMPoint, UserProfile } from "@/lib/api";
import { RecordsShell } from "@/components/records/RecordsShell";

export const metadata = { title: "Records · FitHub" };

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ highlighted?: string }>;
}) {
  const { token } = await requireAuth();
  const { highlighted } = await searchParams;

  const [prs, profile] = await Promise.all([
    api.analytics.personalRecords(token).catch((): PersonalRecord[] => []),
    api.profile.get(token).catch((): UserProfile | null => null),
  ]);

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
      const [y, m, d] = pr.achieved_at.slice(0, 10).split("-").map(Number) as [
        number,
        number,
        number,
      ];
      const prDate = new Date(y, m - 1, d);
      return now.getTime() - prDate.getTime() < 24 * 60 * 60 * 1000;
    })
    .map((pr) => pr.movement_id);

  return (
    <RecordsShell
      prs={prs}
      trendMap={trendMap}
      recentPRIds={recentPRIds}
      highlighted={highlighted}
      weightUnit={profile?.weight_unit ?? "kg"}
    />
  );
}
