import type { Movement, ResultType } from "@/lib/api";
import type { DraftEntry, DraftSession, DraftSet } from "./types";
import { emptySet } from "./types";

/** A metadata-free draft session for quick-log / tag flows (01 §3, §4). */
export const EMPTY_QUICK_SESSION: DraftSession = {
  title: "",
  sessionType: null,
  workoutFormat: null,
  sessionRpe: null,
  durationInput: "",
  timeCapInput: "",
  location: "",
  bodyweight: "",
  notes: "",
  entries: [],
};

/** Build a single-set entry from a movement and a field-value map (§3, §4). */
export function singleEntryFromMovement(
  movement: Movement,
  resultType: ResultType,
  values: Record<string, string>,
): DraftEntry {
  const set: DraftSet = { ...emptySet() };
  for (const [k, v] of Object.entries(values)) {
    if (k in set) (set as unknown as Record<string, string>)[k] = v;
  }
  return {
    id: crypto.randomUUID(),
    movement,
    resultType,
    implement: movement.implement ?? null,
    side: null,
    note: "",
    scaled: false,
    sets: [set],
    previous: [],
    bestE1rmKg: null,
    contextState: "idle",
  };
}
