import { toast } from "sonner";
import { ls } from "@/lib/local-storage";

const MILESTONE_WEEKS = [4, 8, 12, 26, 52] as const;

const MILESTONE_MESSAGES: Record<number, string> = {
  4: "One month of consistency.",
  8: "Two months strong.",
  12: "Three months — you're building a real habit.",
  26: "Half a year. Your training is part of who you are now.",
  52: "One full year. Legendary.",
};

export function checkAndFireMilestoneToast(currentStreak: number): void {
  if (currentStreak === 0) return;
  const lastSeen = parseInt(
    ls.get("fithub_streak_milestone_last_seen") ?? "0",
    10,
  );
  const nextMilestone = MILESTONE_WEEKS.find(
    (m) => m <= currentStreak && m > lastSeen,
  );
  if (!nextMilestone) return;

  toast(`streak: ${nextMilestone}wk — ${MILESTONE_MESSAGES[nextMilestone]}`, {
    id: `streak_milestone_${nextMilestone}`,
    duration: 7000,
    icon: "🔥",
    style: { borderColor: "var(--green)" },
  });
  ls.set("fithub_streak_milestone_last_seen", String(nextMilestone));
}

export function fireInitialCommitToast(): void {
  toast("Initial commit. Your training repo is live.", {
    id: "initial_commit",
    duration: 6000,
    icon: "🟢",
  });
}

export function firePrToast(
  movementName: string,
  bestKg: number,
  deltaKg: number | null,
): void {
  toast.success(
    deltaKg != null && deltaKg > 0
      ? `New PR! ${movementName} ${bestKg} kg — +${deltaKg} kg from your previous best`
      : `First PR! ${movementName} ${bestKg} kg — your benchmark is set`,
    {
      id: `pr_${movementName}_${bestKg}`,
      duration: 5000,
      icon: "🏷️",
    },
  );
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
