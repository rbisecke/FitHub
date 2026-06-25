import type { WorkoutSummary } from "@/lib/api";

export interface StreakResult {
  currentStreak: number;
  personalBest: number;
  thisWeekCount: number;
  frequencyTarget: number;
  atRisk: boolean;
  isComeback: boolean;
}

function getISOWeekKey(date: Date): string {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7; // Sun → 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isoWeekStart(weekKey: string): Date {
  const parts = weekKey.split("-W");
  const year = Number(parts[0]);
  const week = Number(parts[1]);
  // Jan 4 is always in week 1
  const jan4 = new Date(year, 0, 4);
  const dayOffset = (jan4.getDay() + 6) % 7; // Mon=0
  const start = new Date(jan4);
  start.setDate(jan4.getDate() - dayOffset + (week - 1) * 7);
  return start;
}

function longestConsecutiveRun(weeks: Set<string>): number {
  const sorted = [...weeks].sort();
  if (sorted.length === 0) return 0;
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = isoWeekStart(sorted[i - 1]!);
    const curr = isoWeekStart(sorted[i]!);
    const diffWeeks = Math.round(
      (curr.getTime() - prev.getTime()) / (7 * 86_400_000),
    );
    if (diffWeeks === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

export function streakCalc(
  workouts: WorkoutSummary[],
  frequencyTarget = 3,
): StreakResult {
  if (workouts.length === 0) {
    return {
      currentStreak: 0,
      personalBest: 0,
      thisWeekCount: 0,
      frequencyTarget,
      atRisk: false,
      isComeback: false,
    };
  }

  // workouts must be sorted descending by performed_at
  const daysByWeek = new Map<string, Set<string>>();
  for (const w of workouts) {
    const date = new Date(w.performed_at);
    const weekKey = getISOWeekKey(date);
    const dayKey = date.toLocaleDateString("en-CA"); // YYYY-MM-DD
    if (!daysByWeek.has(weekKey)) daysByWeek.set(weekKey, new Set());
    daysByWeek.get(weekKey)!.add(dayKey);
  }

  const completedWeeks = new Set<string>();
  for (const [week, days] of daysByWeek) {
    if (days.size >= frequencyTarget) completedWeeks.add(week);
  }

  const now = new Date();
  const currentWeekKey = getISOWeekKey(now);
  const thisWeekCount = daysByWeek.get(currentWeekKey)?.size ?? 0;

  // Walk backwards from previous week (current partial week excluded from streak)
  const previousWeekStart = addDays(isoWeekStart(currentWeekKey), -7);
  const previousWeekKey = getISOWeekKey(previousWeekStart);
  let streak = 0;
  let weekCursor = previousWeekKey;
  for (let i = 0; i < 1000 && completedWeeks.has(weekCursor); i++) {
    streak++;
    weekCursor = getISOWeekKey(addDays(isoWeekStart(weekCursor), -7));
  }

  const personalBest = longestConsecutiveRun(completedWeeks);

  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon … 6=Sat
  // At-risk from Thursday onwards: Sun(0), Thu(4), Fri(5), Sat(6)
  const remainingDays = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const atRisk =
    streak > 0 && thisWeekCount < frequencyTarget && remainingDays <= 3;

  const mostRecent = new Date(workouts[0]!.performed_at);
  const daysSinceLast = (now.getTime() - mostRecent.getTime()) / 86_400_000;
  const isComeback = daysSinceLast >= 14;

  return {
    currentStreak: streak,
    personalBest,
    thisWeekCount,
    frequencyTarget,
    atRisk,
    isComeback,
  };
}
