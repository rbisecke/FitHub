import type { AdminInfraSnapshot } from "@/lib/api";

// Shared status → color mapping for infra health indicators. Used by both
// InfraStatusBar (top-of-admin status pills) and InfraPanel (detail page
// block headers) so the two can't silently drift apart.
export const STATUS_COLOR: Record<AdminInfraSnapshot["status"], string> = {
  healthy: "var(--green)",
  degraded: "var(--amber)",
  critical: "var(--red)",
  unknown: "var(--muted)",
};

// `DeploymentEvent.status` is free-text (platform-reported, not an enum —
// 08 §8), so this only recognizes the known Vercel/Railway values called out
// in the spec and falls back to a neutral/muted treatment for anything else
// rather than guessing at a color for an unrecognized string.
const KNOWN_DEPLOY_STATUS_COLOR: Record<string, string> = {
  READY: "var(--green)",
  SUCCESS: "var(--green)",
  ERROR: "var(--red)",
  CRASHED: "var(--red)",
  FAILED: "var(--red)",
  BUILDING: "var(--amber)",
  SLEEPING: "var(--amber)",
  QUEUED: "var(--amber)",
};

const FAILED_DEPLOY_STATUSES = new Set(["ERROR", "CRASHED", "FAILED"]);

export function deployStatusColor(status: string | null): string {
  if (!status) return "var(--muted)";
  return KNOWN_DEPLOY_STATUS_COLOR[status] ?? "var(--muted)";
}

/** True for the known "this deploy failed" statuses — used to gate the
 * full-card danger fill on deployment rows and the red deploy-marker overlay
 * on the sparklines (08 §8 States: "Deploy failure"). Unknown strings are
 * deliberately NOT treated as failures — only recognized failure statuses
 * escalate. */
export function isFailedDeployStatus(status: string | null): boolean {
  return status != null && FAILED_DEPLOY_STATUSES.has(status);
}
