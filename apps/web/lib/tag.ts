import type { ResultTypeValue } from "@/components/log/ResultFields";
import type { LastResult } from "@/lib/api";

export function parseTimeText(raw: string): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (colonMatch) {
    return parseInt(colonMatch[1]!, 10) * 60 + parseInt(colonMatch[2]!, 10);
  }
  const n = parseInt(trimmed, 10);
  if (!isNaN(n)) {
    return Math.floor(n / 100) * 60 + (n % 100);
  }
  return null;
}

function movementToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatTimeSlug(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0 && s > 0) return `${m}m${s}s`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

function formatNumSlug(n: number): string {
  return String(n).replace(".", "p");
}

export function buildTagLabel(
  movementName: string | null | undefined,
  resultType: ResultTypeValue,
  values:
    | {
        load_kg?: string;
        reps?: string;
        time_text?: string;
        distance_m?: string;
        calories?: string;
        rounds?: string;
        partial_reps?: string;
        watts?: string;
        height_cm?: string;
        pace_text?: string;
      }
    | null
    | undefined,
): string {
  if (!movementName) return "$ git tag";
  const slug = movementToSlug(movementName);
  if (!values) return `$ git tag ${slug}`;

  if (resultType === "weight") {
    const load = values.load_kg ? parseFloat(values.load_kg) : null;
    const reps = values.reps ? parseInt(values.reps, 10) : null;
    if (!load) return `$ git tag ${slug}`;
    const loadSlug = `${formatNumSlug(load)}kg`;
    return reps
      ? `$ git tag ${slug}-${loadSlug}-x${reps}`
      : `$ git tag ${slug}-${loadSlug}`;
  }
  if (resultType === "reps") {
    const reps = values.reps ? parseInt(values.reps, 10) : null;
    if (!reps) return `$ git tag ${slug}`;
    return `$ git tag ${slug}-${reps}reps`;
  }
  if (resultType === "time") {
    const s = values.time_text ? parseTimeText(values.time_text) : null;
    if (!s) return `$ git tag ${slug}`;
    return `$ git tag ${slug}-${formatTimeSlug(s)}`;
  }
  if (resultType === "distance") {
    const d = values.distance_m ? parseFloat(values.distance_m) : null;
    if (!d) return `$ git tag ${slug}`;
    return `$ git tag ${slug}-${formatNumSlug(d)}m`;
  }
  if (resultType === "calories") {
    const c = values.calories ? parseInt(values.calories, 10) : null;
    if (!c) return `$ git tag ${slug}`;
    return `$ git tag ${slug}-${c}cal`;
  }
  if (resultType === "rounds_reps") {
    const r = values.rounds ? parseInt(values.rounds, 10) : null;
    const pr = values.partial_reps ? parseInt(values.partial_reps, 10) : null;
    if (r == null) return `$ git tag ${slug}`;
    return pr != null
      ? `$ git tag ${slug}-${r}r${pr}`
      : `$ git tag ${slug}-${r}rounds`;
  }
  if (resultType === "watts") {
    const w = values.watts ? parseInt(values.watts, 10) : null;
    if (!w) return `$ git tag ${slug}`;
    return `$ git tag ${slug}-${w}w`;
  }
  if (resultType === "pace") {
    const s = values.pace_text ? parseTimeText(values.pace_text) : null;
    if (!s) return `$ git tag ${slug}`;
    return `$ git tag ${slug}-pace-${formatTimeSlug(s)}`;
  }
  return `$ git tag ${slug}`;
}

export type PrStatus = "new-pr" | "matches" | "below" | "first" | null;

export function computePrStatus(
  resultType: ResultTypeValue,
  values:
    | {
        load_kg?: string;
        reps?: string;
        time_text?: string;
        distance_m?: string;
        calories?: string;
        rounds?: string;
        partial_reps?: string;
        watts?: string;
        height_cm?: string;
        pace_text?: string;
      }
    | null
    | undefined,
  lastResult: LastResult | null | undefined,
): PrStatus {
  if (!values) return null;

  // Check if a meaningful value has been entered
  const hasValue =
    (resultType === "weight" && !!values.load_kg) ||
    (resultType === "reps" && !!values.reps) ||
    (resultType === "time" && !!values.time_text) ||
    (resultType === "distance" && !!values.distance_m) ||
    (resultType === "calories" && !!values.calories) ||
    (resultType === "rounds_reps" && !!values.rounds) ||
    (resultType === "watts" && !!values.watts) ||
    (resultType === "height" && !!values.height_cm) ||
    (resultType === "pace" && !!values.pace_text);

  if (!hasValue) return null;
  if (lastResult === undefined) return null; // still loading
  if (lastResult === null) return "first";

  if (resultType === "weight") {
    const newLoad = parseFloat(values.load_kg ?? "0");
    const newReps = values.reps ? parseInt(values.reps, 10) : 0;
    const prevLoad = parseFloat(lastResult.load_kg ?? "0");
    const prevReps = lastResult.reps ?? 0;
    if (newLoad > prevLoad) return "new-pr";
    if (newLoad === prevLoad && newReps > prevReps) return "new-pr";
    if (newLoad === prevLoad && newReps === prevReps) return "matches";
    return "below";
  }
  if (resultType === "reps") {
    const n = parseInt(values.reps ?? "0", 10);
    const prev = lastResult.reps ?? 0;
    if (n > prev) return "new-pr";
    if (n === prev) return "matches";
    return "below";
  }
  if (resultType === "time") {
    // Lower is better
    const s = parseTimeText(values.time_text ?? "");
    const prev = lastResult.time_s;
    if (s == null || prev == null) return null;
    if (s < prev) return "new-pr";
    if (s === prev) return "matches";
    return "below";
  }
  if (resultType === "distance") {
    const d = parseFloat(values.distance_m ?? "0");
    const prev = parseFloat(String(lastResult.distance_m ?? "0"));
    if (d > prev) return "new-pr";
    if (d === prev) return "matches";
    return "below";
  }
  if (resultType === "calories") {
    const c = parseInt(values.calories ?? "0", 10);
    const prev = lastResult.calories ?? 0;
    if (c > prev) return "new-pr";
    if (c === prev) return "matches";
    return "below";
  }
  if (resultType === "rounds_reps") {
    const r = parseInt(values.rounds ?? "0", 10);
    const pr = parseInt(values.partial_reps ?? "0", 10);
    const newScore = r * 1000 + pr;
    const prevScore =
      (lastResult.rounds ?? 0) * 1000 + (lastResult.partial_reps ?? 0);
    if (newScore > prevScore) return "new-pr";
    if (newScore === prevScore) return "matches";
    return "below";
  }
  if (resultType === "watts") {
    const w = parseInt(values.watts ?? "0", 10);
    const prev = lastResult.watts ?? 0;
    if (w > prev) return "new-pr";
    if (w === prev) return "matches";
    return "below";
  }
  if (resultType === "pace") {
    // Lower is better
    const s = parseTimeText(values.pace_text ?? "");
    const prev = lastResult.time_s;
    if (s == null || prev == null) return null;
    if (s < prev) return "new-pr";
    if (s === prev) return "matches";
    return "below";
  }
  return null;
}

export function formatCurrentBest(r: LastResult): string {
  switch (r.result_type) {
    case "weight": {
      const load = r.load_kg != null ? String(r.load_kg) : null;
      if (!load) return "";
      return r.reps != null ? `${load} kg × ${r.reps}` : `${load} kg`;
    }
    case "reps":
      return r.reps != null ? `${r.reps} reps` : "";
    case "time": {
      if (r.time_s == null) return "";
      const m = Math.floor(r.time_s / 60);
      const s = r.time_s % 60;
      return `${m}:${String(s).padStart(2, "0")}`;
    }
    case "distance":
      return r.distance_m != null ? `${r.distance_m} m` : "";
    case "calories":
      return r.calories != null ? `${r.calories} cal` : "";
    case "rounds_reps":
      if (r.rounds == null) return "";
      return r.partial_reps != null
        ? `${r.rounds} + ${r.partial_reps} reps`
        : `${r.rounds} rounds`;
    case "watts":
      return r.watts != null ? `${r.watts} W` : "";
    default:
      return "";
  }
}

export interface RecentMovement {
  movement_id: string;
  movement_name: string;
  result_type: ResultTypeValue;
  modality?: string;
}

const CACHE_KEY = "fithub:recent_movements";
const CACHE_LIMIT = 8;

export function readRecentMovements(): RecentMovement[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function writeRecentMovements(
  movementId: string,
  movementName: string,
  resultType: ResultTypeValue,
  modality?: string,
) {
  try {
    const cached = readRecentMovements();
    const updated = [
      {
        movement_id: movementId,
        movement_name: movementName,
        result_type: resultType,
        modality,
      },
      ...cached.filter((m) => m.movement_id !== movementId),
    ].slice(0, CACHE_LIMIT);
    localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage may be unavailable (SSR, incognito)
  }
}
