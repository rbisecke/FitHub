import type { ArchetypeSlug, TrainingAge } from "@/lib/types/plans";

const AGE_LABEL: Record<TrainingAge, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/**
 * Generate a deterministic plan title from the wizard's final state.
 * The title is pre-filled in the editable title field but the user can override it.
 *
 * For archetypes that include a target movement (skill-acquisition, one-rm-peak),
 * the movement name is embedded when provided.
 */
export function generatePlanTitle(
  archetype: ArchetypeSlug,
  trainingAge: TrainingAge,
  targetMovementName?: string | null,
): string {
  const age = AGE_LABEL[trainingAge];

  switch (archetype) {
    case "general-crossfit":
      return `${age} CrossFit Program`;
    case "strength-bias":
      return `${age} Strength-Bias Block`;
    case "travel-minimal":
      return `${age} Travel Program`;
    case "aerobic-base":
      return `${age} Aerobic Base Block`;
    case "bodyweight-calisthenics":
      return `${age} Bodyweight Program`;
    case "skill-acquisition":
      return targetMovementName
        ? `${age} ${targetMovementName} Skill Program`
        : `${age} Skill Program`;
    case "one-rm-peak":
      return targetMovementName
        ? `${age} ${targetMovementName} Peak Cycle`
        : `${age} Peak Cycle`;
  }
}
