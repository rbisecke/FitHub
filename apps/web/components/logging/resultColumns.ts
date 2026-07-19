import type { ResultType } from "@/lib/api";
import type { DraftSet, PreviousSet } from "./types";

/**
 * Column adaptation per result_type (01 §2.6). The UI is the guardrail — only
 * fields meaningful to the entry's result_type are exposed.
 */

export interface ColumnDef {
  /** Key into DraftSet's editable string fields. */
  key: keyof Pick<
    DraftSet,
    | "load"
    | "reps"
    | "time"
    | "distance"
    | "calories"
    | "height"
    | "rounds"
    | "partialReps"
    | "watts"
    | "pace"
  >;
  label: string;
  /** Placeholder / input hint. */
  placeholder: string;
  /** inputMode for the field. */
  mode: "decimal" | "numeric" | "text";
}

const LOAD: ColumnDef = {
  key: "load",
  label: "kg",
  placeholder: "0",
  mode: "decimal",
};
const REPS: ColumnDef = {
  key: "reps",
  label: "reps",
  placeholder: "0",
  mode: "numeric",
};
const TIME: ColumnDef = {
  key: "time",
  label: "time",
  placeholder: "m:ss",
  mode: "text",
};
const DISTANCE: ColumnDef = {
  key: "distance",
  label: "dist",
  placeholder: "m",
  mode: "decimal",
};
const CALORIES: ColumnDef = {
  key: "calories",
  label: "cal",
  placeholder: "0",
  mode: "numeric",
};
const HEIGHT: ColumnDef = {
  key: "height",
  label: "cm",
  placeholder: "0",
  mode: "decimal",
};
const ROUNDS: ColumnDef = {
  key: "rounds",
  label: "rounds",
  placeholder: "0",
  mode: "numeric",
};
const PARTIAL: ColumnDef = {
  key: "partialReps",
  label: "+reps",
  placeholder: "0",
  mode: "numeric",
};
const WATTS: ColumnDef = {
  key: "watts",
  label: "watts",
  placeholder: "0",
  mode: "numeric",
};
const PACE: ColumnDef = {
  key: "pace",
  label: "/500m",
  placeholder: "m:ss",
  mode: "text",
};

export function columnsFor(
  resultType: ResultType,
  weightUnit: string,
): ColumnDef[] {
  const load = weightUnit === "lb" ? { ...LOAD, label: "lb" } : LOAD;
  switch (resultType) {
    case "weight":
      return [load, REPS];
    case "reps":
      return [REPS];
    case "time":
      return [TIME];
    case "distance":
      return [DISTANCE];
    case "calories":
      return [CALORIES];
    case "height":
      return [HEIGHT];
    case "rounds_reps":
      return [ROUNDS, PARTIAL];
    case "watts":
      return [WATTS];
    case "pace":
      return [PACE];
    default:
      return [load, REPS];
  }
}

/** Whether a result type shows a multi-set table with "+ Add Set" (§2.4, §2.6). */
export function isMultiSet(resultType: ResultType): boolean {
  // Single-value result types (cardio-ish) don't repeat sets in this domain.
  return resultType === "weight" || resultType === "reps";
}

/** Render a previous set's value for a given column, or null if absent (§2.7). */
export function previousValueFor(
  prev: PreviousSet | undefined,
  col: ColumnDef,
): string | null {
  if (!prev) return null;
  const map: Record<ColumnDef["key"], number | null | undefined> = {
    load: prev.load,
    reps: prev.reps,
    time: prev.time_s,
    distance: prev.distance_m,
    calories: prev.calories,
    height: null,
    rounds: prev.rounds,
    partialReps: null,
    watts: prev.watts,
    pace: null,
  };
  const v = map[col.key];
  if (v == null) return null;
  if (col.key === "time") {
    const s = Number(v);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }
  return String(v);
}
