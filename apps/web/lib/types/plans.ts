// Local TypeScript types for the plan wizard.
// Not generated from the API — these describe wizard-layer UI state.

export type ArchetypeSlug =
  | "general-crossfit"
  | "strength-bias"
  | "travel-minimal"
  | "aerobic-base"
  | "bodyweight-calisthenics"
  | "skill-acquisition"
  | "one-rm-peak";

export type EquipmentPreset =
  | "Full Gym"
  | "Home Setup"
  | "Barbell Only"
  | "Travel"
  | "Bodyweight";

export type WizardStep = 0 | 1 | 2 | 3 | 4;

export type TrainingAge = "beginner" | "intermediate" | "advanced";

export interface WizardState {
  step: WizardStep;
  archetype: ArchetypeSlug | null;
  selectedPresets: Set<EquipmentPreset>;
  daysPerWeek: number;
  targetMovementId: string | null;
  targetMovementName: string | null;
  current1rmKg: number | null;
  trainingAge: TrainingAge | null;
  maxDurationWeeks: number | null;
  isSubmitting: boolean;
  error: string | null;
  planId: string | null;
}

export type PrerequisiteStatusValue = "checked" | "pending" | "target";

export interface PrerequisiteStatus {
  movementId: string;
  movementName: string;
  status: PrerequisiteStatusValue;
}
