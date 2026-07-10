"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api/client";
import { resolveEquipmentTags } from "@/lib/plans/equipment";
import { generatePlanTitle } from "@/lib/plans/titles";
import type {
  WizardState,
  WizardStep,
  ArchetypeSlug,
  EquipmentPreset,
  TrainingAge,
} from "@/lib/types/plans";
import type { CreatePlanRequest } from "@/lib/api/plans";

// Archetypes that include a target-movement step (step 3).
const NEEDS_TARGET_STEP = new Set<ArchetypeSlug>([
  "skill-acquisition",
  "one-rm-peak",
]);

function needsTargetStep(archetype: ArchetypeSlug | null): boolean {
  return archetype !== null && NEEDS_TARGET_STEP.has(archetype);
}

// Build a local-date string (YYYY-MM-DD) without UTC drift.
function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const initialState: WizardState = {
  step: 0,
  archetype: null,
  selectedPresets: new Set(),
  daysPerWeek: 4,
  targetMovementId: null,
  targetMovementName: null,
  current1rmKg: null,
  trainingAge: null,
  maxDurationWeeks: null,
  isSubmitting: false,
  error: null,
  planId: null,
};

export interface UsePlanWizardReturn {
  state: WizardState;
  setArchetype: (archetype: ArchetypeSlug) => void;
  togglePreset: (preset: EquipmentPreset) => void;
  setDaysPerWeek: (days: number) => void;
  setTargetMovement: (id: string, name: string) => void;
  set1rm: (kg: number) => void;
  setTrainingAge: (age: TrainingAge) => void;
  setMaxDuration: (weeks: number) => void;
  goNext: () => void;
  goPrev: () => void;
  submit: (token: string) => Promise<void>;
  buildSubmitPayload: () => CreatePlanRequest;
}

export function usePlanWizard(): UsePlanWizardReturn {
  const [state, setState] = useState<WizardState>(initialState);

  const setArchetype = useCallback((archetype: ArchetypeSlug) => {
    setState((s) => ({ ...s, archetype }));
  }, []);

  const togglePreset = useCallback((preset: EquipmentPreset) => {
    setState((s) => {
      const next = new Set(s.selectedPresets);
      if (next.has(preset)) {
        next.delete(preset);
      } else {
        next.add(preset);
      }
      return { ...s, selectedPresets: next };
    });
  }, []);

  const setDaysPerWeek = useCallback((days: number) => {
    setState((s) => ({ ...s, daysPerWeek: days }));
  }, []);

  const setTargetMovement = useCallback((id: string, name: string) => {
    setState((s) => ({
      ...s,
      targetMovementId: id,
      targetMovementName: name,
    }));
  }, []);

  const set1rm = useCallback((kg: number) => {
    setState((s) => ({ ...s, current1rmKg: kg }));
  }, []);

  const setTrainingAge = useCallback((age: TrainingAge) => {
    setState((s) => ({ ...s, trainingAge: age }));
  }, []);

  const setMaxDuration = useCallback((weeks: number) => {
    setState((s) => ({ ...s, maxDurationWeeks: weeks }));
  }, []);

  const goNext = useCallback(() => {
    setState((s) => {
      const current = s.step;
      // From step 2 (Schedule): skip step 3 (Target) unless archetype needs it.
      if (current === 2 && !needsTargetStep(s.archetype)) {
        return { ...s, step: 4 as WizardStep };
      }
      if (current < 4) {
        return { ...s, step: (current + 1) as WizardStep };
      }
      return s;
    });
  }, []);

  const goPrev = useCallback(() => {
    setState((s) => {
      const current = s.step;
      // From step 4 (Training Age): skip back over step 3 (Target) unless archetype needs it.
      if (current === 4 && !needsTargetStep(s.archetype)) {
        return { ...s, step: 2 as WizardStep };
      }
      if (current > 0) {
        return { ...s, step: (current - 1) as WizardStep };
      }
      return s;
    });
  }, []);

  const buildSubmitPayload = useCallback((): CreatePlanRequest => {
    const s = state;
    const weeks = s.maxDurationWeeks ?? 12;
    return {
      archetype: s.archetype!,
      title: generatePlanTitle(
        s.archetype!,
        s.trainingAge!,
        s.targetMovementName,
      ),
      training_age: s.trainingAge!,
      days_per_week: s.daysPerWeek,
      equipment: resolveEquipmentTags(s.selectedPresets),
      start_date: localDateString(new Date()),
      weeks,
      target_movement_id: s.targetMovementId ?? undefined,
      current_1rm_kg: s.current1rmKg ?? undefined,
      max_duration_weeks: s.maxDurationWeeks ?? undefined,
    };
  }, [state]);

  const submit = useCallback(
    async (token: string): Promise<void> => {
      setState((s) => ({ ...s, isSubmitting: true, error: null }));

      const controller = new AbortController();
      let cancelled = false;

      try {
        const payload = buildSubmitPayload();
        const task = await api.plans.create(token, payload);

        // Poll the task until complete (max 12 attempts, 5s interval).
        let attempts = 0;
        while (attempts < 12) {
          await sleep(5000);
          if (cancelled) return;

          const latest = await api.plans.pollTask(token, task.task_id);

          if (latest.status === "complete") {
            if (!cancelled) {
              setState((s) => ({
                ...s,
                planId: latest.plan_id ?? null,
                isSubmitting: false,
              }));
            }
            return;
          }

          if (latest.status === "failed") {
            if (!cancelled) {
              setState((s) => ({
                ...s,
                error: latest.error ?? "Plan generation failed.",
                isSubmitting: false,
              }));
            }
            return;
          }

          attempts++;
        }

        if (!cancelled) {
          setState((s) => ({
            ...s,
            error: "Plan generation timed out.",
            isSubmitting: false,
          }));
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        if (!cancelled) {
          setState((s) => ({
            ...s,
            error: "Failed to create plan.",
            isSubmitting: false,
          }));
        }
      } finally {
        cancelled = true;
        controller.abort();
      }
    },
    [buildSubmitPayload],
  );

  return {
    state,
    setArchetype,
    togglePreset,
    setDaysPerWeek,
    setTargetMovement,
    set1rm,
    setTrainingAge,
    setMaxDuration,
    goNext,
    goPrev,
    submit,
    buildSubmitPayload,
  };
}
