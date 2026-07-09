import { describe, it, expect } from "vitest";
import {
  EQUIPMENT_PRESET_TAGS,
  resolveEquipmentTags,
} from "@/lib/plans/equipment";
import { generatePlanTitle } from "@/lib/plans/titles";
import type { EquipmentPreset } from "@/lib/types/plans";

// ---------------------------------------------------------------------------
// resolveEquipmentTags
// ---------------------------------------------------------------------------

describe("resolveEquipmentTags", () => {
  it("Full Gym returns all expected tags", () => {
    const tags = resolveEquipmentTags(new Set<EquipmentPreset>(["Full Gym"]));
    const expected = [...EQUIPMENT_PRESET_TAGS["Full Gym"]].sort();
    expect(tags).toEqual(expected);
    expect(tags).toContain("barbell");
    expect(tags).toContain("rower");
    expect(tags).toContain("rings");
  });

  it("deduplicates tags when multiple presets share equipment", () => {
    // "Full Gym" and "Home Setup" both include pull_up_bar, dumbbells, kettlebell, jump_rope
    const tags = resolveEquipmentTags(
      new Set<EquipmentPreset>(["Full Gym", "Home Setup"]),
    );
    const unique = [...new Set(tags)];
    expect(tags).toEqual(unique);
    // Should contain items from both presets
    expect(tags).toContain("barbell"); // Full Gym only
    expect(tags).toContain("resistance_band"); // Home Setup only
    expect(tags).toContain("pull_up_bar"); // shared — present once
  });

  it("deduplicates tags when Barbell Only and Full Gym share barbell/rack/pull_up_bar", () => {
    const tags = resolveEquipmentTags(
      new Set<EquipmentPreset>(["Barbell Only", "Full Gym"]),
    );
    const barrelCount = tags.filter((t) => t === "barbell").length;
    expect(barrelCount).toBe(1);
  });

  it("returns [] for an empty Set", () => {
    expect(resolveEquipmentTags(new Set<EquipmentPreset>())).toEqual([]);
  });

  it("Travel returns only its minimal tag set", () => {
    const tags = resolveEquipmentTags(new Set<EquipmentPreset>(["Travel"]));
    expect(tags).toEqual(["bodyweight", "jump_rope", "resistance_band"]);
  });

  it("Bodyweight returns only bodyweight tags", () => {
    const tags = resolveEquipmentTags(new Set<EquipmentPreset>(["Bodyweight"]));
    expect(tags).toEqual(["bodyweight", "pull_up_bar"]);
  });

  it("returns sorted results", () => {
    const tags = resolveEquipmentTags(new Set<EquipmentPreset>(["Full Gym"]));
    expect(tags).toEqual([...tags].sort());
  });
});

// ---------------------------------------------------------------------------
// generatePlanTitle
// ---------------------------------------------------------------------------

describe("generatePlanTitle", () => {
  it.each([
    ["general-crossfit", "general-crossfit", "Beginner CrossFit Program"],
    ["strength-bias", "strength-bias", "Intermediate Strength-Bias Block"],
    ["travel-minimal", "travel-minimal", "Advanced Travel Program"],
    ["aerobic-base", "aerobic-base", "Beginner Aerobic Base Block"],
    [
      "bodyweight-calisthenics",
      "bodyweight-calisthenics",
      "Intermediate Bodyweight Program",
    ],
    [
      "skill-acquisition (no target)",
      "skill-acquisition",
      "Advanced Skill Program",
    ],
    ["one-rm-peak (no target)", "one-rm-peak", "Beginner Peak Cycle"],
  ] as const)(
    "%s",
    (
      _label: string,
      archetype:
        | "general-crossfit"
        | "strength-bias"
        | "travel-minimal"
        | "aerobic-base"
        | "bodyweight-calisthenics"
        | "skill-acquisition"
        | "one-rm-peak",
      expected: string,
    ) => {
      const ages = ["beginner", "intermediate", "advanced"] as const;
      const age =
        ages.find((a) => expected.toLowerCase().startsWith(a)) ?? "beginner";
      expect(generatePlanTitle(archetype, age)).toBe(expected);
    },
  );

  it("skill-acquisition with target movement includes movement name", () => {
    expect(
      generatePlanTitle("skill-acquisition", "intermediate", "Bar Muscle-Up"),
    ).toBe("Intermediate Bar Muscle-Up Skill Program");
  });

  it("skill-acquisition without target omits null gracefully", () => {
    expect(generatePlanTitle("skill-acquisition", "beginner", null)).toBe(
      "Beginner Skill Program",
    );
  });

  it("skill-acquisition without target (undefined) omits gracefully", () => {
    expect(generatePlanTitle("skill-acquisition", "advanced")).toBe(
      "Advanced Skill Program",
    );
  });

  it("one-rm-peak with target movement includes movement name", () => {
    expect(generatePlanTitle("one-rm-peak", "advanced", "Snatch")).toBe(
      "Advanced Snatch Peak Cycle",
    );
  });

  it("one-rm-peak without target omits null gracefully", () => {
    expect(generatePlanTitle("one-rm-peak", "intermediate", null)).toBe(
      "Intermediate Peak Cycle",
    );
  });

  it("never returns an empty string for any archetype + age combination", () => {
    const archetypes = [
      "general-crossfit",
      "strength-bias",
      "travel-minimal",
      "aerobic-base",
      "bodyweight-calisthenics",
      "skill-acquisition",
      "one-rm-peak",
    ] as const;
    const ages = ["beginner", "intermediate", "advanced"] as const;
    for (const archetype of archetypes) {
      for (const age of ages) {
        const title = generatePlanTitle(archetype, age);
        expect(title.length).toBeGreaterThan(0);
      }
    }
  });
});
