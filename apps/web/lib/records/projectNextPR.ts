import type { E1RMPoint } from "@/lib/api";

interface Projection {
  targetKg: number;
  weeksOut: number;
}

export function projectNextPR(
  points: E1RMPoint[],
  currentBestKg: number,
): Projection | null {
  if (points.length < 3) return null;

  const t0 = new Date(points[0]!.day).getTime();
  const xs = points.map((p) => (new Date(p.day).getTime() - t0) / 86_400_000);
  const ys = points.map((p) => p.estimated_1rm_kg);

  const n = xs.length;
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  const slope =
    xs.reduce((sum, x, i) => sum + (x - xMean) * (ys[i]! - yMean), 0) /
    xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0);

  if (slope <= 0) return null;

  const target = Math.ceil(currentBestKg / 2.5) * 2.5;
  if (target <= currentBestKg) return null;

  const lastX = xs[xs.length - 1]!;
  const xTarget = xMean + (target - yMean) / slope;
  const daysOut = xTarget - lastX;

  if (daysOut < 0 || daysOut > 365) return null;

  return {
    targetKg: target,
    weeksOut: Math.round(daysOut / 7),
  };
}
