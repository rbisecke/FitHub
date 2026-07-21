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

export type PlanTaskStatus = "pending" | "running" | "complete" | "failed";

export interface WizardState {
  step: WizardStep;
  archetype: ArchetypeSlug | null;
  selectedPresets: Set<EquipmentPreset>;
  daysPerWeek: number;
  /** Local calendar date "YYYY-MM-DD" — the plan's first day (02 §2.3 step 3). */
  startDate: string;
  targetMovementId: string | null;
  targetMovementName: string | null;
  current1rmKg: number | null;
  /** True once a real (non-fallback) 1RM was found for the target movement —
   * drives the "From your best logged e1RM" vs "No previous 1RM found" copy. */
  current1rmSource: "history" | "none" | null;
  trainingAge: TrainingAge | null;
  maxDurationWeeks: number | null;
  customTitle: string | null;
  isSubmitting: boolean;
  error: string | null;
  planId: string | null;
  /** Async generation state (02 §3) — surfaced once submit() posts the task. */
  taskStatus: PlanTaskStatus | null;
  /** POST /plans rejected at the 3/hr bucket — distinct calm treatment, not an error. */
  rateLimited: boolean;
  /** 12th poll returned with no terminal state (02 §3). */
  timedOut: boolean;
}

export type PrerequisiteStatusValue = "checked" | "pending" | "target";

export interface PrerequisiteStatus {
  movementId: string;
  movementName: string;
  status: PrerequisiteStatusValue;
  /**
   * The real `current_entry_point` rung ("you are here", design spec §10).
   * Independent of `status` because the current entry point can equal the
   * target movement itself once every prerequisite is confirmed.
   */
  isCurrent?: boolean;
}
