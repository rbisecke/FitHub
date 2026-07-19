import type { BodyRegion, StandardRegionKey } from "./taxonomy";

/**
 * Schematic silhouette geometry for Variant A (05 §1.1 "Asset deliverable").
 *
 * This is deliberately NOT anatomically precise artwork — the spec calls for
 * "a flat mid-tone body on a light clinical surface; thin outlines subdivide
 * regions," built from basic shapes, not a detailed medical illustration. It
 * is a single data-driven geometry table (rather than four hand-authored SVG
 * files) so the Standard tier's grouping/compound shapes can be generated as
 * the visual union of their Detailed sub-shapes, per the spec's explicit
 * "avoid a second, drift-prone set of artwork" instruction — one source of
 * truth for both tiers.
 *
 * Each `BodyRegion` enum value is assigned to exactly one view (front or
 * back), never both — required so `id="{enum_value}"` stays unique in the
 * DOM even when front+back render simultaneously side-by-side on desktop
 * (≥768px, no toggle). Where the spec names two regions as a required
 * tap-target-disambiguation pair (rotator_cuff/shoulder, lateral_elbow/
 * medial_elbow), both members of the pair are placed on the same view.
 */
export type Side = "front" | "back";

export const VIEW_BOX = "0 0 200 500";

interface Ellipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/** One or two (bilateral) ellipses unioned into a single tappable shape. */
type ShapeSpec = Ellipse | { left: Ellipse; right: Ellipse };

function ellipsePath({ cx, cy, rx, ry }: Ellipse): string {
  return `M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${rx * 2},0 a${rx},${ry} 0 1,0 ${
    -rx * 2
  },0 Z`;
}

/** Build the `d` attribute for a (possibly bilateral) shape spec. */
export function shapePathD(spec: ShapeSpec): string {
  if ("left" in spec) {
    return `${ellipsePath(spec.left)} ${ellipsePath(spec.right)}`;
  }
  return ellipsePath(spec);
}

/** Union multiple shape specs into one `d` (Standard-tier grouping shapes). */
function unionPathD(specs: ShapeSpec[]): string {
  return specs.map(shapePathD).join(" ");
}

/** Approximate rendered diameter (px) at a 375px-wide single-view mobile render. */
const MOBILE_RENDER_SCALE = 320 / 200; // silhouette column ≈320px at 375px viewport

function approxDiameterPx(spec: ShapeSpec): number {
  const e = "left" in spec ? spec.left : spec;
  return Math.min(e.rx, e.ry) * 2 * MOBILE_RENDER_SCALE;
}

export interface RegionShape {
  id: BodyRegion;
  spec: ShapeSpec;
}

export interface GroupingShape {
  /** Synthetic per-view id — never submitted as a `body_region`. */
  id: string;
  key: Extract<StandardRegionKey, "upper_arm_group" | "foot_lower_leg_group">;
  spec: ShapeSpec[];
}

// ---------------------------------------------------------------------------
// FRONT view
// ---------------------------------------------------------------------------

const F = {
  neck: { cx: 100, cy: 48, rx: 15, ry: 14 } satisfies Ellipse,
  chest: { cx: 100, cy: 95, rx: 34, ry: 24 } satisfies Ellipse,
  bicep: {
    left: { cx: 52, cy: 115, rx: 13, ry: 38 },
    right: { cx: 148, cy: 115, rx: 13, ry: 38 },
  } satisfies { left: Ellipse; right: Ellipse },
  elbowStandard: {
    left: { cx: 48, cy: 170, rx: 15, ry: 14 },
    right: { cx: 152, cy: 170, rx: 15, ry: 14 },
  } satisfies { left: Ellipse; right: Ellipse },
  elbowDetailed: {
    left: { cx: 48, cy: 170, rx: 7, ry: 7 },
    right: { cx: 152, cy: 170, rx: 7, ry: 7 },
  } satisfies { left: Ellipse; right: Ellipse },
  lateralElbow: {
    left: { cx: 40, cy: 164, rx: 5, ry: 5 },
    right: { cx: 160, cy: 164, rx: 5, ry: 5 },
  } satisfies { left: Ellipse; right: Ellipse },
  medialElbow: {
    left: { cx: 40, cy: 178, rx: 5, ry: 5 },
    right: { cx: 160, cy: 178, rx: 5, ry: 5 },
  } satisfies { left: Ellipse; right: Ellipse },
  forearm: {
    left: { cx: 44, cy: 205, rx: 10, ry: 28 },
    right: { cx: 156, cy: 205, rx: 10, ry: 28 },
  } satisfies { left: Ellipse; right: Ellipse },
  wrist: {
    left: { cx: 38, cy: 238, rx: 14, ry: 14 },
    right: { cx: 162, cy: 238, rx: 14, ry: 14 },
  } satisfies { left: Ellipse; right: Ellipse },
  hip: { cx: 100, cy: 272, rx: 36, ry: 18 } satisfies Ellipse,
  groin: { cx: 100, cy: 294, rx: 13, ry: 9 } satisfies Ellipse,
  hipFlexor: {
    left: { cx: 76, cy: 302, rx: 10, ry: 13 },
    right: { cx: 124, cy: 302, rx: 10, ry: 13 },
  } satisfies { left: Ellipse; right: Ellipse },
  quad: {
    left: { cx: 76, cy: 348, rx: 17, ry: 45 },
    right: { cx: 124, cy: 348, rx: 17, ry: 45 },
  } satisfies { left: Ellipse; right: Ellipse },
  itBand: {
    left: { cx: 58, cy: 348, rx: 7, ry: 42 },
    right: { cx: 142, cy: 348, rx: 7, ry: 42 },
  } satisfies { left: Ellipse; right: Ellipse },
  kneeStandard: {
    left: { cx: 76, cy: 400, rx: 15, ry: 15 },
    right: { cx: 124, cy: 400, rx: 15, ry: 15 },
  } satisfies { left: Ellipse; right: Ellipse },
  kneeDetailed: {
    left: { cx: 76, cy: 400, rx: 8, ry: 8 },
    right: { cx: 124, cy: 400, rx: 8, ry: 8 },
  } satisfies { left: Ellipse; right: Ellipse },
  patellarTendon: {
    left: { cx: 76, cy: 414, rx: 6, ry: 6 },
    right: { cx: 124, cy: 414, rx: 6, ry: 6 },
  } satisfies { left: Ellipse; right: Ellipse },
  shin: {
    left: { cx: 76, cy: 445, rx: 10, ry: 30 },
    right: { cx: 124, cy: 445, rx: 10, ry: 30 },
  } satisfies { left: Ellipse; right: Ellipse },
  ankle: {
    left: { cx: 76, cy: 478, rx: 14, ry: 14 },
    right: { cx: 124, cy: 478, rx: 14, ry: 14 },
  } satisfies { left: Ellipse; right: Ellipse },
  arch: {
    left: { cx: 76, cy: 492, rx: 12, ry: 6 },
    right: { cx: 124, cy: 492, rx: 12, ry: 6 },
  } satisfies { left: Ellipse; right: Ellipse },
};

// ---------------------------------------------------------------------------
// BACK view
// ---------------------------------------------------------------------------

const B = {
  shoulderStandard: {
    left: { cx: 58, cy: 72, rx: 17, ry: 14 },
    right: { cx: 142, cy: 72, rx: 17, ry: 14 },
  } satisfies { left: Ellipse; right: Ellipse },
  shoulderDetailed: {
    left: { cx: 58, cy: 70, rx: 9, ry: 8 },
    right: { cx: 142, cy: 70, rx: 9, ry: 8 },
  } satisfies { left: Ellipse; right: Ellipse },
  rotatorCuff: {
    left: { cx: 58, cy: 84, rx: 6, ry: 5 },
    right: { cx: 142, cy: 84, rx: 6, ry: 5 },
  } satisfies { left: Ellipse; right: Ellipse },
  upperBack: { cx: 100, cy: 115, rx: 32, ry: 20 } satisfies Ellipse,
  lat: {
    left: { cx: 66, cy: 130, rx: 13, ry: 26 },
    right: { cx: 134, cy: 130, rx: 13, ry: 26 },
  } satisfies { left: Ellipse; right: Ellipse },
  tricep: {
    left: { cx: 42, cy: 125, rx: 11, ry: 38 },
    right: { cx: 158, cy: 125, rx: 11, ry: 38 },
  } satisfies { left: Ellipse; right: Ellipse },
  lowerBack: { cx: 100, cy: 170, rx: 28, ry: 18 } satisfies Ellipse,
  siJoint: { cx: 100, cy: 200, rx: 10, ry: 13 } satisfies Ellipse,
  glute: {
    left: { cx: 76, cy: 214, rx: 20, ry: 22 },
    right: { cx: 124, cy: 214, rx: 20, ry: 22 },
  } satisfies { left: Ellipse; right: Ellipse },
  hamstring: {
    left: { cx: 76, cy: 270, rx: 16, ry: 42 },
    right: { cx: 124, cy: 270, rx: 16, ry: 42 },
  } satisfies { left: Ellipse; right: Ellipse },
  calf: {
    left: { cx: 76, cy: 340, rx: 14, ry: 34 },
    right: { cx: 124, cy: 340, rx: 14, ry: 34 },
  } satisfies { left: Ellipse; right: Ellipse },
  achilles: {
    left: { cx: 76, cy: 385, rx: 6, ry: 10 },
    right: { cx: 124, cy: 385, rx: 6, ry: 10 },
  } satisfies { left: Ellipse; right: Ellipse },
};

/** Which view (front/back) a given enum region is drawn on. */
export const REGION_SIDE: Record<BodyRegion, Side> = {
  neck: "front",
  chest: "front",
  wrist: "front",
  elbow: "front",
  lateral_elbow: "front",
  medial_elbow: "front",
  bicep: "front",
  forearm: "front",
  hip: "front",
  groin: "front",
  hip_flexor: "front",
  quad: "front",
  it_band: "front",
  knee: "front",
  patellar_tendon: "front",
  shin: "front",
  ankle: "front",
  arch: "front",
  shoulder: "back",
  rotator_cuff: "back",
  upper_back: "back",
  lower_back: "back",
  lat: "back",
  tricep: "back",
  glute: "back",
  si_joint: "back",
  hamstring: "back",
  calf: "back",
  achilles: "back",
  // `other` has no silhouette shape at all (05 §1.1, search-only).
  other: "front",
};

export function regionsForSide(side: Side): BodyRegion[] {
  return (Object.keys(REGION_SIDE) as BodyRegion[]).filter(
    (r) => r !== "other" && REGION_SIDE[r] === side,
  );
}

/** Standard-tier shapes (region-backed, direct-select) per view. */
export function standardShapesForSide(side: Side): RegionShape[] {
  if (side === "front") {
    return [
      { id: "neck", spec: F.neck },
      { id: "chest", spec: F.chest },
      { id: "elbow", spec: F.elbowStandard },
      { id: "wrist", spec: F.wrist },
      { id: "hip", spec: F.hip },
      { id: "quad", spec: F.quad },
      { id: "knee", spec: F.kneeStandard },
      { id: "ankle", spec: F.ankle },
    ];
  }
  return [
    { id: "shoulder", spec: B.shoulderStandard },
    { id: "upper_back", spec: B.upperBack },
    { id: "lower_back", spec: B.lowerBack },
    { id: "glute", spec: B.glute },
    { id: "hamstring", spec: B.hamstring },
    { id: "calf", spec: B.calf },
  ];
}

/**
 * Standard-tier grouping shapes (no direct enum, auto-switch to Detailed).
 * Both "upper arm" and "foot & lower leg" have sub-regions on both views
 * (bicep/forearm front + tricep back; shin/arch front + achilles back), so
 * each view gets its own grouping shape covering only the sub-regions it can
 * actually show — tapping either one switches to Detailed on the *current*
 * side and pulses whatever's visible there; the rest is reached by flipping
 * the Front/Back toggle, still within Detailed tier.
 */
export function groupingShapesForSide(side: Side): GroupingShape[] {
  if (side === "front") {
    return [
      {
        id: "upper_arm_front",
        key: "upper_arm_group",
        spec: [F.bicep, F.forearm],
      },
      {
        id: "foot_lower_leg_front",
        key: "foot_lower_leg_group",
        spec: [F.shin, F.arch],
      },
    ];
  }
  return [
    {
      id: "upper_arm_back",
      key: "upper_arm_group",
      spec: [B.tricep],
    },
    {
      id: "foot_lower_leg_back",
      key: "foot_lower_leg_group",
      spec: [B.achilles],
    },
  ];
}

/** Detailed-tier shapes (region-backed) per view. */
export function detailedShapesForSide(side: Side): RegionShape[] {
  if (side === "front") {
    return [
      { id: "neck", spec: F.neck },
      { id: "chest", spec: F.chest },
      { id: "bicep", spec: F.bicep },
      { id: "elbow", spec: F.elbowDetailed },
      { id: "lateral_elbow", spec: F.lateralElbow },
      { id: "medial_elbow", spec: F.medialElbow },
      { id: "forearm", spec: F.forearm },
      { id: "wrist", spec: F.wrist },
      { id: "hip", spec: F.hip },
      { id: "groin", spec: F.groin },
      { id: "hip_flexor", spec: F.hipFlexor },
      { id: "quad", spec: F.quad },
      { id: "it_band", spec: F.itBand },
      { id: "knee", spec: F.kneeDetailed },
      { id: "patellar_tendon", spec: F.patellarTendon },
      { id: "shin", spec: F.shin },
      { id: "ankle", spec: F.ankle },
      { id: "arch", spec: F.arch },
    ];
  }
  return [
    { id: "shoulder", spec: B.shoulderDetailed },
    { id: "rotator_cuff", spec: B.rotatorCuff },
    { id: "upper_back", spec: B.upperBack },
    { id: "lat", spec: B.lat },
    { id: "tricep", spec: B.tricep },
    { id: "lower_back", spec: B.lowerBack },
    { id: "si_joint", spec: B.siJoint },
    { id: "glute", spec: B.glute },
    { id: "hamstring", spec: B.hamstring },
    { id: "calf", spec: B.calf },
    { id: "achilles", spec: B.achilles },
  ];
}

export function groupingShapeD(shape: GroupingShape): string {
  return unionPathD(shape.spec);
}

/**
 * Tap-target-disambiguation clusters (05 §1.1, required, not optional). Known
 * at build time from this file's own geometry rather than measured at
 * runtime — every member renders below 44×44px at a 375px mobile viewport.
 */
export interface InsetCluster {
  key: string;
  side: Side;
  regions: BodyRegion[];
}

export const INSET_CLUSTERS: InsetCluster[] = [
  {
    key: "elbow_cluster",
    side: "front",
    regions: ["elbow", "lateral_elbow", "medial_elbow"],
  },
  {
    key: "shoulder_cluster",
    side: "back",
    regions: ["shoulder", "rotator_cuff"],
  },
  { key: "knee_cluster", side: "front", regions: ["knee", "patellar_tendon"] },
];

export function insetClusterFor(
  side: Side,
  region: BodyRegion,
): InsetCluster | undefined {
  return INSET_CLUSTERS.find(
    (c) => c.side === side && c.regions.includes(region),
  );
}

/** Sanity helper used by tests — confirms the small shapes really are small. */
export function isBelowTapTarget(spec: ShapeSpec): boolean {
  return approxDiameterPx(spec) < 44;
}

export { F as FRONT_GEOMETRY, B as BACK_GEOMETRY };
