// Cardio equipment conversion reference (01 §11).
//
// Static reference content — NOT a computed feature (there is no conversion API).
// Given a running distance, show the machine-equivalent for Row / Ski / C2 BikeErg /
// Assault-Echo. The 4-distance table (incl. 200m) is the corrected version closing
// the gap flagged in 01 §11; the distance-token matcher below is extended to 200m so
// the new row actually triggers. Logic only — UI lands in Effort 3.

export type CardioMachine = "row" | "ski" | "bikeErg" | "assaultBike";

export type RunDistanceKey = "200m" | "400m" | "800m" | "1mi";

export interface DistanceEquivalents {
  /** Distance in metres, or null when the machine is calories-only (Assault/Echo). */
  row: number;
  ski: number;
  bikeErg: number;
  assaultBike: null;
}

export interface CalorieEquivalents {
  row: number;
  ski: number;
  bikeErg: number;
  /** Assault/Echo calories are a bodyweight/effort-dependent range (01 §11). */
  assaultBike: { min: number; max: number };
}

export interface CardioConversionRow {
  run: RunDistanceKey;
  /** Run distance in metres (1mi = 1609). */
  runMeters: number;
  distance: DistanceEquivalents;
  calories: CalorieEquivalents;
}

/**
 * The canonical lookup table (01 §11). Distance values are the community-standard
 * machine equivalents; calorie values are "stimulus equivalents," not precise burn.
 */
export const CARDIO_CONVERSION_TABLE: readonly CardioConversionRow[] = [
  {
    run: "200m",
    runMeters: 200,
    distance: { row: 250, ski: 200, bikeErg: 600, assaultBike: null },
    calories: { row: 10, ski: 10, bikeErg: 8, assaultBike: { min: 6, max: 7 } },
  },
  {
    run: "400m",
    runMeters: 400,
    distance: { row: 500, ski: 400, bikeErg: 1000, assaultBike: null },
    calories: {
      row: 20,
      ski: 20,
      bikeErg: 16,
      assaultBike: { min: 12, max: 14 },
    },
  },
  {
    run: "800m",
    runMeters: 800,
    distance: { row: 1000, ski: 800, bikeErg: 2000, assaultBike: null },
    calories: {
      row: 40,
      ski: 40,
      bikeErg: 32,
      assaultBike: { min: 25, max: 28 },
    },
  },
  {
    run: "1mi",
    runMeters: 1609,
    distance: { row: 2000, ski: 1600, bikeErg: 4000, assaultBike: null },
    calories: {
      row: 80,
      ski: 80,
      bikeErg: 64,
      assaultBike: { min: 50, max: 56 },
    },
  },
] as const;

/** Human labels for machines (UI-facing). */
export const MACHINE_LABELS: Record<CardioMachine, string> = {
  row: "Row Erg",
  ski: "Ski Erg",
  bikeErg: "C2 BikeErg",
  assaultBike: "Assault/Echo Bike",
};

/** Look up a single row by its run-distance key. */
export function cardioConversion(
  distance: RunDistanceKey,
): CardioConversionRow | undefined {
  return CARDIO_CONVERSION_TABLE.find((row) => row.run === distance);
}

// Distance-token matcher (01 §11, §7.2). Decides when a movement name is
// running-equivalent and which run distance it maps to, so the "Substitute cardio"
// chip can surface. Extended to recognize 200m (the gap fix).
const DISTANCE_TOKEN_PATTERNS: { key: RunDistanceKey; pattern: RegExp }[] = [
  { key: "1mi", pattern: /\b(1\s*mile|mile|1600\s*m|1609\s*m)\b/i },
  { key: "800m", pattern: /\b800\s*m(?:eters?)?\b/i },
  { key: "400m", pattern: /\b400\s*m(?:eters?)?\b/i },
  { key: "200m", pattern: /\b200\s*m(?:eters?)?\b/i },
];

const RUN_KEYWORD = /\b(run|running|sprint)\b/i;

/**
 * Match a movement/exercise display name to a run distance for the conversion chip.
 * Returns the matched `RunDistanceKey`, or null if the name isn't a recognized
 * running-equivalent distance. A named distance token wins on its own; a bare
 * run/sprint keyword with no distance returns null (nothing to convert).
 */
export function matchRunDistance(name: string): RunDistanceKey | null {
  for (const { key, pattern } of DISTANCE_TOKEN_PATTERNS) {
    if (pattern.test(name)) return key;
  }
  return null;
}

/** True when a name reads as a run/sprint at all (with or without a distance). */
export function isRunningMovement(name: string): boolean {
  return RUN_KEYWORD.test(name) || matchRunDistance(name) !== null;
}
