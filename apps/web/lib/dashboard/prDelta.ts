import type { PersonalRecord } from "@/lib/api";

// ── Goals-in-progress (Open PRs widget) ──────────────────────────────────────

export interface GoalItem {
  name: string;
  branch: string;
  progressPct: number;
  currentValue: string;
  targetValue: string;
  gapText: string;
  color: "accent" | "blue" | "hot";
}

function nextMilestone(kg: number): number {
  if (kg < 50) return Math.ceil(kg / 5) * 5;
  if (kg < 100) return Math.ceil(kg / 10) * 10;
  if (kg < 200) return Math.ceil(kg / 25) * 25;
  return Math.ceil(kg / 50) * 50;
}

function slugify(name: string): string {
  return (
    "feat/" +
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  );
}

export function prGoals(prs: PersonalRecord[]): GoalItem[] {
  return prs.slice(0, 3).map((pr) => {
    const current = pr.best_1rm_kg;
    const target = nextMilestone(current);
    const pct = Math.round((current / target) * 100);
    const gap = (target - current).toFixed(1).replace(/\.0$/, "");
    const color: GoalItem["color"] =
      pct >= 85 ? "accent" : pct >= 60 ? "blue" : "hot";

    return {
      name: `${pr.movement_name} ${target}kg`,
      branch: slugify(`${pr.movement_name}-${target}`),
      progressPct: pct,
      currentValue: `${current}kg`,
      targetValue: `${target}kg`,
      gapText: `${gap}kg to merge`,
      color,
    };
  });
}

// ── Historical delta (used by Records page) ───────────────────────────────────

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
