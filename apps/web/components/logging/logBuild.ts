import type { CreateResultBody, CreateWorkoutBody } from "@/lib/api";
import type { DraftEntry, DraftSession, DraftSet } from "./types";

/** Flexible time input (01 §8): "712" → 432s, "45" → 45s, "7:12" → 432s. */
export function parseFlexibleTime(input: string): number | null {
  const t = input.trim();
  if (!t) return null;
  if (t.includes(":")) {
    const [m, s] = t.split(":");
    const mm = Number(m);
    const ss = Number(s);
    if (Number.isNaN(mm) || Number.isNaN(ss)) return null;
    return mm * 60 + ss;
  }
  const digits = Number(t);
  if (Number.isNaN(digits)) return null;
  // 3+ digits: last two are seconds (712 → 7:12); otherwise raw seconds.
  if (t.length >= 3) {
    const mm = Math.floor(digits / 100);
    const ss = digits % 100;
    return mm * 60 + ss;
  }
  return digits;
}

function num(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isNaN(n) ? null : n;
}

/** Epley e1RM (kg), valid for 1–36 reps — mirrors the server (01 §2.11). */
export function epley1rm(
  loadKg: number | null,
  reps: number | null,
): number | null {
  if (loadKg == null || reps == null || reps < 1 || reps > 36) return null;
  return loadKg * (1 + reps / 30);
}

function resultFromSet(
  entry: DraftEntry,
  set: DraftSet,
  entryIndex: number,
  setIndex: number,
): CreateResultBody {
  const base: CreateResultBody = {
    movement_id: entry.movement.id,
    result_type: entry.resultType,
    order_index: entryIndex * 100 + setIndex,
    set_index: setIndex,
    scaled: entry.scaled,
    is_pr: false, // server flags PRs; client never asserts one
    pace_distance_m: 500, // default per §2.6 (implicit, not asked each time)
    implement: entry.implement,
    side: entry.side,
    rpe: num(set.rpe),
  };
  switch (entry.resultType) {
    case "weight":
      return { ...base, load_kg: num(set.load), reps: num(set.reps) };
    case "reps":
      return { ...base, reps: num(set.reps) };
    case "time":
      return { ...base, time_s: parseFlexibleTime(set.time) };
    case "distance":
      return { ...base, distance_m: num(set.distance) };
    case "calories":
      return { ...base, calories: num(set.calories) };
    case "height":
      return { ...base, height_cm: num(set.height) };
    case "rounds_reps":
      return {
        ...base,
        rounds: num(set.rounds),
        partial_reps: num(set.partialReps),
      };
    case "watts":
      return { ...base, watts: num(set.watts) };
    case "pace":
      return { ...base, pace_s: parseFlexibleTime(set.pace) };
    default:
      return base;
  }
}

/** True if a built result carries at least one meaningful value field. */
function resultHasValue(r: CreateResultBody): boolean {
  return (
    r.load_kg != null ||
    r.reps != null ||
    r.time_s != null ||
    r.distance_m != null ||
    r.calories != null ||
    r.height_cm != null ||
    r.rounds != null ||
    r.watts != null ||
    r.pace_s != null
  );
}

/** Build the atomic CreateWorkoutRequest from the draft (01 §2.12). */
export function buildCreateWorkout(
  session: DraftSession,
  performedAt: string,
): CreateWorkoutBody {
  const results: CreateResultBody[] = [];
  session.entries.forEach((entry, ei) => {
    entry.sets.forEach((set, si) => {
      const built = resultFromSet(entry, set, ei, si);
      // Skip the always-present empty trailing set (and any blank set) so a
      // commit never persists an all-null result row.
      if (resultHasValue(built)) results.push(built);
    });
  });
  return {
    performed_at: performedAt,
    title: session.title.trim() || null,
    notes: session.notes.trim() || null,
    session_type: session.sessionType,
    workout_format: session.workoutFormat,
    session_rpe: session.sessionRpe,
    duration_s: parseFlexibleTime(session.durationInput),
    time_cap_s: parseFlexibleTime(session.timeCapInput),
    location: session.location.trim() || null,
    bodyweight_kg: num(session.bodyweight),
    is_tag: false,
    results,
  };
}

/** Live volume preview (Σ load×reps) for the summary strip (§2.1). */
export function computeVolumeKg(session: DraftSession): number {
  let total = 0;
  for (const entry of session.entries) {
    for (const set of entry.sets) {
      const l = num(set.load);
      const r = num(set.reps);
      if (l != null && r != null) total += l * r;
    }
  }
  return total;
}

export function countSets(session: DraftSession): number {
  return session.entries.reduce((acc, e) => acc + e.sets.length, 0);
}
