import { toast } from "sonner";

/**
 * Milestone toast (07 §H, milestone half only — the PR-celebration half is a
 * separate surface owned elsewhere). Subtle, in-flow, no spring, no confetti.
 *
 * Deliberately a fresh helper rather than reusing the older
 * `checkAndFireMilestoneToast` in `lib/pr-celebrations.ts`: that one tracks
 * "last seen milestone" in `localStorage`, which is exactly the per-browser
 * mechanism this domain's spec calls out as the cause of a cross-device
 * double-fire bug. This version fires once per real, unread
 * `streak_milestone` notification (server-durable, cross-device-correct —
 * see GamificationMount for the read/guard logic) and renders the backend's
 * own composed `message` string directly rather than re-deriving copy.
 */
export function fireMilestoneToast(message: string): void {
  toast(message, {
    duration: 6000,
  });
}
