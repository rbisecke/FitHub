import { isBenchmark } from "./benchmarks";

export type PRCategory = "strength" | "gymnastics" | "metcon" | "endurance";

const ENDURANCE_KW = [
  "run",
  "row",
  "bike",
  "ski",
  "swim",
  "assault",
  "echo",
  "rower",
  "erg",
  "5k",
  "10k",
  "1k",
  "2k",
  "meter",
  "mile",
  "kilometre",
  "kilometer",
];

const GYMNASTICS_KW = [
  "pull-up",
  "pullup",
  "pull up",
  "muscle-up",
  "muscle up",
  "handstand",
  "hspu",
  "ring dip",
  "bar dip",
  "dip",
  "toes-to-bar",
  "toes to bar",
  "knees-to-elbow",
  "l-sit",
  "pistol",
  "rope climb",
  "pegboard",
  "ring row",
  "kipping",
];

const STRENGTH_KW = [
  "squat",
  "deadlift",
  "press",
  "clean",
  "snatch",
  "jerk",
  "bench",
  "thruster",
  "overhead",
  "push press",
  "push jerk",
  "split jerk",
  "back squat",
  "front squat",
  "overhead squat",
  "romanian",
  "rdl",
  "good morning",
  "strict press",
  "box jump",
];

function containsAny(name: string, kws: string[]): boolean {
  const lower = name.toLowerCase();
  return kws.some((kw) => lower.includes(kw));
}

export function categorise(movementName: string): PRCategory {
  if (isBenchmark(movementName)) return "metcon";
  if (containsAny(movementName, ENDURANCE_KW)) return "endurance";
  if (containsAny(movementName, GYMNASTICS_KW)) return "gymnastics";
  if (containsAny(movementName, STRENGTH_KW)) return "strength";
  return "strength";
}

export const CATEGORY_ORDER: PRCategory[] = [
  "strength",
  "gymnastics",
  "metcon",
  "endurance",
];

export const CATEGORY_LABEL: Record<PRCategory, string> = {
  strength: "Strength",
  gymnastics: "Gymnastics",
  metcon: "Metcon",
  endurance: "Endurance",
};
