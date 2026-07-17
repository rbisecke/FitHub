"use client";

import { useState, useCallback, useRef } from "react";
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
  customTitle: null,
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
  set1rm: (kg: number | null) => void;
  setTrainingAge: (age: TrainingAge) => void;
  setMaxDuration: (weeks: number) => void;
  setCustomTitle: (title: string) => void;
  goNext: () => void;
  goPrev: () => void;
  submit: (token: string) => Promise<void>;
  abort: () => void;
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

  const set1rm = useCallback((kg: number | null) => {
    setState((s) => ({ ...s, current1rmKg: kg }));
  }, []);

  const setTrainingAge = useCallback((age: TrainingAge) => {
    setState((s) => ({ ...s, trainingAge: age }));
  }, []);

  const setMaxDuration = useCallback((weeks: number) => {
    setState((s) => ({ ...s, maxDurationWeeks: weeks }));
  }, []);

  // Store null (never an empty/whitespace string) whenever the user hasn't
  // actually typed a real title override — buildSubmitPayload's
  // `customTitle ?? generatePlanTitle(...)` fallback then derives a fresh
  // title at submit time. This is the single place that normalizes title
  // input, so callers (e.g. TrainingAgeStep) don't need to duplicate the
  // empty-check.
  const setCustomTitle = useCallback((title: string) => {
    const trimmed = title.trim();
    setState((s) => ({ ...s, customTitle: trimmed === "" ? null : trimmed }));
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
      title:
        s.customTitle ??
        generatePlanTitle(s.archetype!, s.trainingAge!, s.targetMovementName),
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

  // Holds the controller for the in-flight create/poll request chain so an
  // unmounted (or navigated-away-from) wizard can stop background requests.
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // Synchronous double-submit guard. `isSubmitting` in state is only
  // committed on the next render, so two rapid clicks (or a double-tap on
  // the 44px primary CTA on mobile) dispatched before that render lands can
  // both slip past a `disabled={isSubmitting}` check and each call submit()
  // independently — creating two backend plan-generation jobs. This ref is
  // mutated immediately, before the first `setState`/`await`, so the second
  // call sees it synchronously and bails out.
  const submittingRef = useRef(false);

  const submit = useCallback(
    async (token: string): Promise<void> => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setState((s) => ({ ...s, isSubmitting: true, error: null }));

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const payload = buildSubmitPayload();
        const task = await api.plans.create(token, payload, {
          signal: controller.signal,
        });

        // Poll the task until complete (max 12 attempts, 5s interval).
        let attempts = 0;
        while (attempts < 12) {
          await sleep(5000);
          if (controller.signal.aborted) return;

          const latest = await api.plans.pollTask(token, task.task_id, {
            signal: controller.signal,
          });

          if (latest.status === "complete") {
            setState((s) => ({
              ...s,
              planId: latest.plan_id ?? null,
              isSubmitting: false,
            }));
            return;
          }

          if (latest.status === "failed") {
            setState((s) => ({
              ...s,
              error: latest.error ?? "Plan generation failed.",
              isSubmitting: false,
            }));
            return;
          }

          attempts++;
        }

        setState((s) => ({
          ...s,
          error: "Plan generation timed out.",
          isSubmitting: false,
        }));
      } catch (err) {
        if (controller.signal.aborted || (err as Error).name === "AbortError")
          return;
        setState((s) => ({
          ...s,
          error: "Failed to create plan.",
          isSubmitting: false,
        }));
      } finally {
        submittingRef.current = false;
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
    setCustomTitle,
    goNext,
    goPrev,
    submit,
    abort,
    buildSubmitPayload,
  };
}
