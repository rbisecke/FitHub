import type { ArchetypeSlug } from "@/lib/types/plans";

/**
 * Canonical archetype display names — single source of truth shared by the
 * wizard's archetype step and the plan header, so the same plan never shows
 * two different names for its own archetype.
 */
export const ARCHETYPE_LABEL: Record<ArchetypeSlug, string> = {
  "general-crossfit": "General CrossFit",
  "strength-bias": "Strength Bias",
  "travel-minimal": "Travel Minimal",
  "aerobic-base": "Aerobic Base",
  "bodyweight-calisthenics": "Bodyweight Calisthenics",
  "skill-acquisition": "Skill Acquisition",
  "one-rm-peak": "1RM Peak",
};

export function resolveArchetypeLabel(archetype: string): string {
  return ARCHETYPE_LABEL[archetype as ArchetypeSlug] ?? archetype;
}
