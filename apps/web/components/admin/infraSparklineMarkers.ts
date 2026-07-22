/**
 * Deploy-marker x-position math for the infra sparklines (08 §8). Split out
 * of `InfraPanel.tsx` so the projection is independently testable — a
 * transposition bug here silently mislabels which deploy caused which spike,
 * which is the entire point of overlaying the markers in the first place.
 *
 * Maps a `DeploymentEvent.occurred_at` timestamp onto the SAME time-based
 * x-axis scale the sparkline's metric polyline already uses (`minTime` /
 * `maxTime` / `width`), so a marker lines up exactly under the metric point
 * it corresponds to.
 */
export function computeDeployMarkerX(
  occurredAtIso: string,
  minTime: number,
  maxTime: number,
  width: number,
): number | null {
  const t = new Date(occurredAtIso).getTime();
  if (Number.isNaN(t) || t < minTime || t > maxTime) return null;
  const timeRange = maxTime - minTime || 1;
  return ((t - minTime) / timeRange) * width;
}
