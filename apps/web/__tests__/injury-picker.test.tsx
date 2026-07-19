import { describe, expect, it } from "vitest";
import {
  ALL_BODY_REGIONS,
  CHRONIC_REGIONS,
  DETAILED_TO_STANDARD_PARENT,
  GROUPING_KEYS,
  REGION_DISPLAY_NAME,
  REGION_FAMILY,
  STANDARD_REGIONS,
  STANDARD_TO_DETAILED,
  isChronicRegion,
  isGroupingKey,
} from "@/components/injuries/picker/taxonomy";
import {
  INSET_CLUSTERS,
  REGION_SIDE,
  detailedShapesForSide,
  groupingShapesForSide,
  isBelowTapTarget,
  regionsForSide,
  standardShapesForSide,
} from "@/components/injuries/picker/geometry";

describe("body-region taxonomy", () => {
  it("has exactly 29 named regions, none duplicated", () => {
    expect(ALL_BODY_REGIONS.length).toBe(29);
    expect(new Set(ALL_BODY_REGIONS).size).toBe(29);
  });

  it("gives every region (+ other) a display name and a family", () => {
    for (const region of [...ALL_BODY_REGIONS, "other" as const]) {
      expect(REGION_DISPLAY_NAME[region]).toBeTruthy();
      expect(REGION_FAMILY[region]).toBeTruthy();
    }
  });

  it("marks exactly the nine documented chronic/overuse regions", () => {
    expect(CHRONIC_REGIONS).toHaveLength(9);
    expect(CHRONIC_REGIONS).toEqual(
      expect.arrayContaining([
        "it_band",
        "hip_flexor",
        "forearm",
        "arch",
        "achilles",
        "patellar_tendon",
        "rotator_cuff",
        "lateral_elbow",
        "medial_elbow",
      ]),
    );
    expect(isChronicRegion("achilles")).toBe(true);
    expect(isChronicRegion("knee")).toBe(false);
  });

  it("has ~16 Standard-tier concepts, two of which are groupings", () => {
    expect(STANDARD_REGIONS.length).toBe(16);
    expect(GROUPING_KEYS).toHaveLength(2);
    expect(isGroupingKey("upper_arm_group")).toBe(true);
    expect(isGroupingKey("foot_lower_leg_group")).toBe(true);
    expect(isGroupingKey("hip")).toBe(false);
  });

  it("maps every Standard parent to a non-empty Detailed expansion", () => {
    for (const key of STANDARD_REGIONS) {
      expect(STANDARD_TO_DETAILED[key].length).toBeGreaterThan(0);
    }
  });

  it("reaches every one of the 29 enum values through at least one Standard parent's expansion", () => {
    const covered = new Set<string>();
    for (const key of STANDARD_REGIONS) {
      for (const region of STANDARD_TO_DETAILED[key]) covered.add(region);
    }
    for (const region of ALL_BODY_REGIONS) {
      expect(covered.has(region)).toBe(true);
    }
  });

  it("has exactly one documented double-parent exception (quad/hamstring/it_band)", () => {
    const occurrences = new Map<string, string[]>();
    for (const key of STANDARD_REGIONS) {
      for (const region of STANDARD_TO_DETAILED[key]) {
        occurrences.set(region, [...(occurrences.get(region) ?? []), key]);
      }
    }
    const duplicated = [...occurrences.entries()].filter(
      ([, parents]) => parents.length > 1,
    );
    expect(duplicated.map(([region]) => region).sort()).toEqual(
      ["hamstring", "it_band", "quad"].sort(),
    );
    for (const [, parents] of duplicated) {
      expect(parents.sort()).toEqual(["hamstring", "quad"].sort());
    }
  });

  it("matches the documented Standard -> Detailed mapping exactly", () => {
    expect(STANDARD_TO_DETAILED.elbow.sort()).toEqual(
      ["elbow", "lateral_elbow", "medial_elbow"].sort(),
    );
    expect(STANDARD_TO_DETAILED.shoulder.sort()).toEqual(
      ["rotator_cuff", "shoulder"].sort(),
    );
    expect(STANDARD_TO_DETAILED.knee.sort()).toEqual(
      ["knee", "patellar_tendon"].sort(),
    );
    expect(STANDARD_TO_DETAILED.hip.sort()).toEqual(
      ["groin", "hip", "hip_flexor", "si_joint"].sort(),
    );
    expect(STANDARD_TO_DETAILED.calf).toEqual(["calf"]);
    expect(STANDARD_TO_DETAILED.upper_back.sort()).toEqual(
      ["lat", "upper_back"].sort(),
    );
    expect(STANDARD_TO_DETAILED.upper_arm_group.sort()).toEqual(
      ["bicep", "forearm", "tricep"].sort(),
    );
    expect(STANDARD_TO_DETAILED.foot_lower_leg_group.sort()).toEqual(
      ["achilles", "arch", "shin"].sort(),
    );
    // unchanged-across-tiers regions are their own sole expansion
    for (const region of [
      "neck",
      "chest",
      "lower_back",
      "wrist",
      "glute",
      "ankle",
    ] as const) {
      expect(STANDARD_TO_DETAILED[region]).toEqual([region]);
    }
  });

  it("resolves detailed-only regions back to a Standard parent", () => {
    expect(DETAILED_TO_STANDARD_PARENT.groin).toBe("hip");
    expect(DETAILED_TO_STANDARD_PARENT.si_joint).toBe("hip");
    expect(DETAILED_TO_STANDARD_PARENT.lateral_elbow).toBe("elbow");
    expect(DETAILED_TO_STANDARD_PARENT.rotator_cuff).toBe("shoulder");
    expect(DETAILED_TO_STANDARD_PARENT.patellar_tendon).toBe("knee");
  });

  it("never shows `other` as a silhouette/grid region distinct from the search fallback list", () => {
    // `other` is deliberately excluded from ALL_BODY_REGIONS (the drawn
    // taxonomy) and only reachable via the shared search list, per 05 §1.1.
    expect(ALL_BODY_REGIONS).not.toContain("other");
  });
});

describe("silhouette geometry", () => {
  it("assigns every region to exactly one side (front xor back)", () => {
    for (const region of ALL_BODY_REGIONS) {
      expect(["front", "back"]).toContain(REGION_SIDE[region]);
    }
    const front = new Set(regionsForSide("front"));
    const back = new Set(regionsForSide("back"));
    for (const region of front) expect(back.has(region)).toBe(false);
    expect(front.size + back.size).toBe(29);
  });

  it("keeps required tap-target-disambiguation pairs on the same view", () => {
    for (const cluster of INSET_CLUSTERS) {
      for (const region of cluster.regions) {
        expect(REGION_SIDE[region]).toBe(cluster.side);
      }
    }
    const elbowCluster = INSET_CLUSTERS.find((c) => c.key === "elbow_cluster");
    expect(elbowCluster?.regions.sort()).toEqual(
      ["elbow", "lateral_elbow", "medial_elbow"].sort(),
    );
    const shoulderCluster = INSET_CLUSTERS.find(
      (c) => c.key === "shoulder_cluster",
    );
    expect(shoulderCluster?.regions.sort()).toEqual(
      ["rotator_cuff", "shoulder"].sort(),
    );
  });

  it("flags every inset-cluster member as below the 44px mobile tap target", () => {
    for (const cluster of INSET_CLUSTERS) {
      const shapes = detailedShapesForSide(cluster.side).filter((s) =>
        cluster.regions.includes(s.id),
      );
      expect(shapes.length).toBe(cluster.regions.length);
      for (const shape of shapes) {
        expect(isBelowTapTarget(shape.spec)).toBe(true);
      }
    }
  });

  it("gives Standard-tier direct-select shapes a comfortable (>=44px) tap target", () => {
    for (const side of ["front", "back"] as const) {
      for (const shape of standardShapesForSide(side)) {
        expect(isBelowTapTarget(shape.spec)).toBe(false);
      }
    }
  });

  it("only renders grouping shapes on views that have sub-regions to expand into", () => {
    for (const side of ["front", "back"] as const) {
      for (const grouping of groupingShapesForSide(side)) {
        expect(grouping.spec.length).toBeGreaterThan(0);
      }
    }
  });

  it("draws every Standard-tier shape id as a real Standard-region key", () => {
    for (const side of ["front", "back"] as const) {
      for (const shape of standardShapesForSide(side)) {
        expect(STANDARD_REGIONS).toContain(shape.id);
      }
    }
  });

  it("gives both grouping keys a Standard-tier tap affordance on every view that has a sub-region to reach", () => {
    // upper_arm_group: bicep + forearm are front, tricep is back.
    // foot_lower_leg_group: shin + arch are front, achilles is back.
    const frontGroupings = groupingShapesForSide("front").map((g) => g.key);
    const backGroupings = groupingShapesForSide("back").map((g) => g.key);
    expect(frontGroupings.sort()).toEqual(
      ["foot_lower_leg_group", "upper_arm_group"].sort(),
    );
    expect(backGroupings.sort()).toEqual(
      ["foot_lower_leg_group", "upper_arm_group"].sort(),
    );
  });
});
