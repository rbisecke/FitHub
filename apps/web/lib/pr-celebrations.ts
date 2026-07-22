import { toast } from "sonner";
import { ls } from "@/lib/local-storage";

// Milestone toasts and PR celebrations now live server-driven/component-based
// (Domain 07 §F/§H): see `lib/gamification/milestone-toast.ts` (fired from a
// real, unread `streak_milestone` notification rather than a `localStorage`
// "last seen" flag, which caused a cross-device double-fire bug) and
// `components/logging/detail/PRCelebrationBanner.tsx` (an in-flow banner per
// the Bible's Hevy-not-SugarWOD decision, not a toast). The former
// `checkAndFireMilestoneToast` and `firePrToast` here were both unwired
// (zero callers) and are removed rather than left as dead code.

export function fireInitialCommitToast(): void {
  toast("Initial commit. Your training repo is live.", {
    id: "initial_commit",
    duration: 6000,
    icon: "🟢",
  });
}

// Clean up PR shimmer keys older than 48 h. Call once on app mount.
export function cleanStaleShimmerKeys(): void {
  ls.keys()
    .filter((k) => k.startsWith("fithub_pr_shimmer_seen_"))
    .forEach((k) => {
      const ts = parseInt(ls.get(k) ?? "0", 10);
      if (Date.now() - ts > 48 * 60 * 60 * 1000) {
        ls.remove(k);
      }
    });
}
