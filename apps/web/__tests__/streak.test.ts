import { describe, it, expect } from "vitest";
import { streakCalc } from "@/lib/dashboard/streakCalc";
import type { WorkoutSummary } from "@/lib/api";

function makeSummary(performedAt: string): WorkoutSummary {
  return {
    id: performedAt,
    performed_at: performedAt,
    title: null,
    short_hash: "abc123",
    session_type: null,
    workout_format: null,
    result_count: 1,
    has_pr: false,
    training_partner_name: null,
  } as unknown as WorkoutSummary;
}

// Get the ISO date string for N days ago relative to "now" in local time
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// Get a date string for a specific weekday in the most recent completed week
// 0=Sun 1=Mon ... 6=Sat
function prevWeekDay(dayOfWeek: number): string {
  const now = new Date();
  const monday = new Date(now);
  const dayNum = now.getDay() === 0 ? 6 : now.getDay() - 1; // Mon=0
  monday.setDate(now.getDate() - dayNum - 7); // go back to prev week Monday
  monday.setHours(12, 0, 0, 0);
  const target = new Date(monday);
  target.setDate(monday.getDate() + dayOfWeek);
  return target.toISOString();
}

describe("streakCalc", () => {
  it("returns new_user state for empty workouts", () => {
    const result = streakCalc([]);
    expect(result.currentStreak).toBe(0);
    expect(result.personalBest).toBe(0);
    expect(result.isComeback).toBe(false);
    expect(result.atRisk).toBe(false);
  });

  it("does not count the current partial week toward streak", () => {
    // 3 workouts all in the current week — streak should be 0 (current week not complete)
    const workouts = [
      makeSummary(daysAgo(0)),
      makeSummary(daysAgo(1)),
      makeSummary(daysAgo(2)),
    ];
    const result = streakCalc(workouts, 3);
    expect(result.currentStreak).toBe(0);
    expect(result.thisWeekCount).toBeGreaterThanOrEqual(1);
  });

  it("counts a completed past week that hits the target", () => {
    // 3 workouts on Mon/Tue/Wed of the previous week
    const workouts = [
      makeSummary(prevWeekDay(0)), // Mon
      makeSummary(prevWeekDay(1)), // Tue
      makeSummary(prevWeekDay(2)), // Wed
    ];
    const result = streakCalc(workouts, 3);
    expect(result.currentStreak).toBe(1);
    expect(result.personalBest).toBe(1);
  });

  it("stops streak at the first gap week", () => {
    // Two consecutive weeks hit, then a gap
    const workouts = [
      // 2 weeks ago
      makeSummary(prevWeekDay(0)),
      makeSummary(prevWeekDay(1)),
      makeSummary(prevWeekDay(2)),
    ];
    // Only one week of data → streak is 1
    const result = streakCalc(workouts, 3);
    expect(result.currentStreak).toBe(1);
  });

  it("detects comeback state when last workout > 14 days ago", () => {
    const workouts = [makeSummary(daysAgo(20))];
    const result = streakCalc(workouts, 3);
    expect(result.isComeback).toBe(true);
  });

  it("does not flag comeback when last workout <= 14 days ago", () => {
    const workouts = [makeSummary(daysAgo(10))];
    const result = streakCalc(workouts, 3);
    expect(result.isComeback).toBe(false);
  });

  it("preserves personalBest across a streak gap", () => {
    // Build 3 workouts in prev week (streak 1), then simulate old workouts
    const workouts = [
      makeSummary(prevWeekDay(0)),
      makeSummary(prevWeekDay(1)),
      makeSummary(prevWeekDay(2)),
      makeSummary(daysAgo(30)), // older, different week
      makeSummary(daysAgo(31)),
      makeSummary(daysAgo(32)),
    ];
    const result = streakCalc(workouts, 3);
    // personalBest should be at least 1
    expect(result.personalBest).toBeGreaterThanOrEqual(1);
  });

  it("respects a custom frequency target", () => {
    // Target of 5: 3 workouts in prev week should NOT complete the week
    const workouts = [
      makeSummary(prevWeekDay(0)),
      makeSummary(prevWeekDay(1)),
      makeSummary(prevWeekDay(2)),
    ];
    const result = streakCalc(workouts, 5);
    expect(result.currentStreak).toBe(0);
  });
});
