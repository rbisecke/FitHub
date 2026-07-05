import type { DailyLoadPoint } from "@/lib/api";

export function getCtlTrend(
  ctl: number,
  series: DailyLoadPoint[],
): { arrow: string; word: string } {
  if (series.length < 14) return { arrow: "→", word: "Stable" };
  const twoWeeksAgo = series[Math.max(0, series.length - 14)];
  const diff = ctl - (twoWeeksAgo?.ctl ?? ctl);
  if (diff > 2) return { arrow: "↑", word: "Rising" };
  if (diff < 0) return { arrow: "↓", word: "Declining" };
  return { arrow: "→", word: "Stable" };
}

export function getAtlLevel(atl: number): string {
  if (atl < 15) return "Low";
  if (atl <= 25) return "Moderate";
  return "High";
}

export function getTsbState(tsb: number): { word: string; className: string } {
  if (tsb > 10) return { word: "Peaked", className: "text-[--green]" };
  if (tsb > 0) return { word: "Good", className: "text-[--green]" };
  if (tsb >= -1) return { word: "Neutral", className: "text-[--muted]" };
  if (tsb >= -10) return { word: "Tired", className: "text-[--amber]" };
  return { word: "Fatigued", className: "text-[--red]" };
}

export function getLoadTrend(
  now: number,
  series: DailyLoadPoint[],
  key: "ctl" | "atl",
): { direction: "up" | "down" | "flat"; label: string } {
  if (series.length < 7)
    return { direction: "flat", label: "Stable vs last week" };
  const weekAgo = series[Math.max(0, series.length - 7)];
  const diff = now - (weekAgo?.[key] ?? now);
  if (diff > 1)
    return { direction: "up", label: `+${diff.toFixed(1)} vs last week` };
  if (diff < -1)
    return { direction: "down", label: `${diff.toFixed(1)} vs last week` };
  return { direction: "flat", label: "Stable vs last week" };
}
