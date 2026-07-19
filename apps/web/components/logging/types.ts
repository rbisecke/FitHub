import type {
  Movement,
  ResultType,
  SessionType,
  WorkoutFormat,
} from "@/lib/api";

/**
 * Client-side draft state for the active-logging screen (01 §2).
 *
 * A draft workout is zero or more movement entries, each with one or more sets.
 * Nothing here is persisted until Commit (§2.12) builds a single
 * CreateWorkoutRequest from it. Each set maps to one Result on commit; the
 * order_index is encoded `entryIndex*100 + set_index` (§2.7) so sets stay
 * grouped and ordered.
 */

export interface DraftSet {
  /** Stable local id — used as the React key, never the array index. */
  id: string;
  /** The type's editable value fields. Strings while editing (§8 flexible input). */
  load: string;
  reps: string;
  time: string;
  distance: string;
  calories: string;
  height: string;
  rounds: string;
  partialReps: string;
  watts: string;
  pace: string;
  rpe: string;
  completed: boolean;
  /** True once this set beat a prior best (server 1RM path, §2.11). */
  isPr: boolean;
}

export interface PreviousSet {
  load?: number | null;
  reps?: number | null;
  time_s?: number | null;
  distance_m?: number | null;
  rounds?: number | null;
  calories?: number | null;
  watts?: number | null;
}

export interface DraftEntry {
  id: string;
  movement: Movement;
  resultType: ResultType;
  implement: string | null;
  side: string | null;
  note: string;
  /** Rx'd (false) / Scaled (true) — §2.7, persisted via the new `scaled` field. */
  scaled: boolean;
  sets: DraftSet[];
  /** Previous session's per-set values, index-aligned; from last-result fetch. */
  previous: PreviousSet[];
  /** Best e1RM (kg) for the current (implement, side), for live PR feedback. */
  bestE1rmKg: number | null;
  /** Fetch state for the previous/PR context line (§2.4). */
  contextState: "idle" | "loading" | "error" | "loaded";
}

export interface DraftSession {
  title: string;
  sessionType: SessionType | null;
  workoutFormat: WorkoutFormat | null;
  sessionRpe: number | null;
  durationInput: string;
  timeCapInput: string;
  location: string;
  bodyweight: string;
  notes: string;
  entries: DraftEntry[];
}

export function emptySet(): DraftSet {
  return {
    id: crypto.randomUUID(),
    load: "",
    reps: "",
    time: "",
    distance: "",
    calories: "",
    height: "",
    rounds: "",
    partialReps: "",
    watts: "",
    pace: "",
    rpe: "",
    completed: false,
    isPr: false,
  };
}
