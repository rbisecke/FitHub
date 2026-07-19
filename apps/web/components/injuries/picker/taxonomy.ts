import type { components } from "@/lib/api/generated";

/**
 * Body-region taxonomy (05 §1.1, §1.3). `BodyRegion` is sourced from the
 * generated OpenAPI types (already present there, just not re-exported from
 * lib/api/index.ts) rather than hand-rolled, so it stays in lockstep with the
 * backend `BodyRegion` enum in apps/api/app/models/injury.py.
 */
export type BodyRegion = components["schemas"]["BodyRegion"];

/** The 29 named regions, in taxonomy-family order. Excludes `other`. */
export const ALL_BODY_REGIONS: readonly BodyRegion[] = [
  // joints (10)
  "shoulder",
  "knee",
  "hip",
  "lower_back",
  "wrist",
  "elbow",
  "ankle",
  "neck",
  "groin",
  "si_joint",
  // muscle bellies (9)
  "hamstring",
  "quad",
  "calf",
  "glute",
  "upper_back",
  "chest",
  "bicep",
  "tricep",
  "lat",
  // soft tissue & tendons (7)
  "hip_flexor",
  "it_band",
  "forearm",
  "rotator_cuff",
  "patellar_tendon",
  "lateral_elbow",
  "medial_elbow",
  // foot & lower leg (3)
  "arch",
  "achilles",
  "shin",
];

export const REGION_DISPLAY_NAME: Record<BodyRegion, string> = {
  shoulder: "Shoulder",
  knee: "Knee",
  hip: "Hip",
  lower_back: "Lower back",
  wrist: "Wrist",
  elbow: "Elbow",
  ankle: "Ankle",
  neck: "Neck",
  groin: "Groin",
  si_joint: "SI joint",
  hamstring: "Hamstring",
  quad: "Quad",
  calf: "Calf",
  glute: "Glute",
  upper_back: "Upper back",
  chest: "Chest",
  bicep: "Bicep",
  tricep: "Tricep",
  lat: "Lat",
  hip_flexor: "Hip flexor",
  it_band: "IT band",
  forearm: "Forearm",
  rotator_cuff: "Rotator cuff",
  patellar_tendon: "Patellar tendon",
  lateral_elbow: "Lateral elbow (tennis elbow)",
  medial_elbow: "Medial elbow (golfer's elbow)",
  arch: "Arch",
  achilles: "Achilles",
  shin: "Shin",
  other: "Other / not listed",
};

export type RegionFamily =
  | "joints"
  | "muscle_bellies"
  | "soft_tissue"
  | "foot_lower_leg"
  | "other";

export const FAMILY_LABEL: Record<RegionFamily, string> = {
  joints: "Joints",
  muscle_bellies: "Muscle bellies",
  soft_tissue: "Soft tissue & tendons",
  foot_lower_leg: "Foot & lower leg",
  other: "Other",
};

/** Display order for family sections — matches 05 §1.1's taxonomy listing. */
export const FAMILY_ORDER: RegionFamily[] = [
  "joints",
  "muscle_bellies",
  "soft_tissue",
  "foot_lower_leg",
  "other",
];

export const REGION_FAMILY: Record<BodyRegion, RegionFamily> = {
  shoulder: "joints",
  knee: "joints",
  hip: "joints",
  lower_back: "joints",
  wrist: "joints",
  elbow: "joints",
  ankle: "joints",
  neck: "joints",
  groin: "joints",
  si_joint: "joints",
  hamstring: "muscle_bellies",
  quad: "muscle_bellies",
  calf: "muscle_bellies",
  glute: "muscle_bellies",
  upper_back: "muscle_bellies",
  chest: "muscle_bellies",
  bicep: "muscle_bellies",
  tricep: "muscle_bellies",
  lat: "muscle_bellies",
  hip_flexor: "soft_tissue",
  it_band: "soft_tissue",
  forearm: "soft_tissue",
  rotator_cuff: "soft_tissue",
  patellar_tendon: "soft_tissue",
  lateral_elbow: "soft_tissue",
  medial_elbow: "soft_tissue",
  arch: "foot_lower_leg",
  achilles: "foot_lower_leg",
  shin: "foot_lower_leg",
  other: "other",
};

/**
 * The nine chronic/overuse regions (05 §1.2, §1.3) — pain_level red-flag
 * substring scanning is skipped for these, so the notes helper drops the
 * "specific words help" framing when one is selected.
 */
export const CHRONIC_REGIONS: readonly BodyRegion[] = [
  "it_band",
  "hip_flexor",
  "forearm",
  "arch",
  "achilles",
  "patellar_tendon",
  "rotator_cuff",
  "lateral_elbow",
  "medial_elbow",
];

const CHRONIC_SET = new Set<BodyRegion>(CHRONIC_REGIONS);

export function isChronicRegion(region: BodyRegion): boolean {
  return CHRONIC_SET.has(region);
}

/**
 * Standard-tier keys (05 §1.1). Fourteen are real `BodyRegion` enum values a
 * Standard tap submits directly; two ("upper arm," "foot & lower leg") are
 * grouping regions with no matching enum — tapping either auto-switches to
 * Detailed tier instead of committing a selection.
 */
export type GroupingKey = "upper_arm_group" | "foot_lower_leg_group";

export type StandardRegionKey = BodyRegion | GroupingKey;

export const GROUPING_KEYS: readonly GroupingKey[] = [
  "upper_arm_group",
  "foot_lower_leg_group",
];

const GROUPING_SET = new Set<StandardRegionKey>(GROUPING_KEYS);

/** Type predicate so callers narrow to a real `BodyRegion` on the `!` branch. */
export function isGroupingKey(key: StandardRegionKey): key is GroupingKey {
  return GROUPING_SET.has(key);
}

/** The ~16 Standard-tier concepts, in the order they read on the silhouette. */
export const STANDARD_REGIONS = [
  "neck",
  "shoulder",
  "chest",
  "upper_back",
  "lower_back",
  "elbow",
  "wrist",
  "upper_arm_group",
  "hip",
  "glute",
  "quad",
  "hamstring",
  "knee",
  "calf",
  "ankle",
  "foot_lower_leg_group",
] as const satisfies readonly StandardRegionKey[];

export type StandardKeyWithMapping = (typeof STANDARD_REGIONS)[number];

export const STANDARD_LABEL: Record<StandardRegionKey, string> = {
  ...REGION_DISPLAY_NAME,
  upper_arm_group: "Upper arm",
  foot_lower_leg_group: "Foot & lower leg",
};

/**
 * Standard parent → Detailed enum values it expands into (05 §1.1). Every one
 * of the 29 enum values is reachable through at least one parent here.
 *
 * One documented exception to "exactly one parent": `quad` and `hamstring`
 * are two separate Standard-tier entries (front thigh, back thigh) that both
 * expand into the same Detailed trio (`quad` + `hamstring` + `it_band`) —
 * the taxonomy doc's own "quad/hamstring outer thigh" line describes one
 * shared expansion, not two independent ones. `DETAILED_TO_STANDARD_PARENT`
 * below resolves the ambiguity by preferring the parent whose key matches
 * the region itself (so a selected `quad` maps back to the `quad` chip, not
 * `hamstring`), and `it_band` — which has no self-matching parent — falls
 * back to whichever of the two is encountered first in `STANDARD_REGIONS`.
 */
export const STANDARD_TO_DETAILED: Record<
  StandardKeyWithMapping,
  BodyRegion[]
> = {
  neck: ["neck"],
  shoulder: ["shoulder", "rotator_cuff"],
  chest: ["chest"],
  upper_back: ["upper_back", "lat"],
  lower_back: ["lower_back"],
  elbow: ["elbow", "lateral_elbow", "medial_elbow"],
  wrist: ["wrist"],
  upper_arm_group: ["bicep", "tricep", "forearm"],
  hip: ["hip", "hip_flexor", "groin", "si_joint"],
  glute: ["glute"],
  quad: ["quad", "hamstring", "it_band"],
  hamstring: ["quad", "hamstring", "it_band"],
  knee: ["knee", "patellar_tendon"],
  calf: ["calf"],
  ankle: ["ankle"],
  foot_lower_leg_group: ["shin", "achilles", "arch"],
};

/** Reverse lookup — which Standard key a given Detailed enum region belongs to. */
export const DETAILED_TO_STANDARD_PARENT: Partial<
  Record<BodyRegion, StandardRegionKey>
> = (() => {
  const map: Partial<Record<BodyRegion, StandardRegionKey>> = {};
  for (const key of STANDARD_REGIONS) {
    for (const region of STANDARD_TO_DETAILED[key]) {
      // quad/hamstring both expand to the same detailed trio; keep the more
      // specific (matching) parent so a selected `quad` or `hamstring` value
      // maps back to its own Standard chip rather than always the first.
      if (map[region] === undefined || region === key) {
        map[region] = key;
      }
    }
  }
  return map;
})();
