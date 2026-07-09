import type { EquipmentPreset } from "@/lib/types/plans";

/**
 * Canonical mapping from equipment preset label to the flat tag list
 * sent to the API as `equipment: string[]`.
 */
export const EQUIPMENT_PRESET_TAGS: Record<EquipmentPreset, string[]> = {
  "Full Gym": [
    "barbell",
    "rack",
    "dumbbells",
    "kettlebell",
    "pull_up_bar",
    "rings",
    "rower",
    "bike",
    "ski",
    "jump_rope",
  ],
  "Home Setup": [
    "dumbbells",
    "kettlebell",
    "pull_up_bar",
    "rings",
    "resistance_band",
    "jump_rope",
  ],
  "Barbell Only": ["barbell", "rack", "pull_up_bar"],
  Travel: ["bodyweight", "resistance_band", "jump_rope"],
  Bodyweight: ["bodyweight", "pull_up_bar"],
};

/**
 * Resolve a set of equipment presets to a flat deduplicated sorted tag list
 * for the API's `equipment` field. Returns [] when no presets are selected,
 * meaning no equipment filter is applied (all movements allowed).
 */
export function resolveEquipmentTags(presets: Set<EquipmentPreset>): string[] {
  const tags = new Set<string>();
  for (const preset of presets) {
    for (const tag of EQUIPMENT_PRESET_TAGS[preset]) {
      tags.add(tag);
    }
  }
  return [...tags].sort();
}
