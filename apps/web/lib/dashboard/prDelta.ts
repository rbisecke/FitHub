import type { PersonalRecord } from "@/lib/api";

export interface PRWithDelta {
  movementName: string;
  bestKg: number;
  achievedAt: string;
  deltaKg: number | null;
}

export function prDelta(prs: PersonalRecord[]): PRWithDelta[] {
  if (prs.length === 0) return [];

  const sorted = [...prs].sort(
    (a, b) =>
      new Date(b.achieved_at).getTime() - new Date(a.achieved_at).getTime(),
  );

  return sorted.slice(0, 2).map((pr) => {
    const prevForMovement = sorted.find(
      (p) =>
        p.movement_id === pr.movement_id &&
        new Date(p.achieved_at).getTime() < new Date(pr.achieved_at).getTime(),
    );
    const rawDelta =
      prevForMovement != null
        ? pr.best_1rm_kg - prevForMovement.best_1rm_kg
        : null;
    const deltaKg =
      rawDelta != null ? +rawDelta.toFixed(rawDelta % 1 === 0 ? 0 : 1) : null;

    return {
      movementName: pr.movement_name,
      bestKg: pr.best_1rm_kg,
      achievedAt: pr.achieved_at,
      deltaKg,
    };
  });
}
