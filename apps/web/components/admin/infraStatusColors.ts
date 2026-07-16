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
