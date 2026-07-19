"use client";

import { useState, useCallback, useRef } from "react";
import { api, ApiError } from "@/lib/api/client";
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
  startDate: localDateString(new Date()),
  targetMovementId: null,
  targetMovementName: null,
  current1rmKg: null,
  current1rmSource: null,
  trainingAge: null,
  maxDurationWeeks: null,
  customTitle: null,
  isSubmitting: false,
  error: null,
  planId: null,
  taskStatus: null,
  rateLimited: false,
  timedOut: false,
};

export interface UsePlanWizardReturn {
  state: WizardState;
  setArchetype: (archetype: ArchetypeSlug) => void;
  togglePreset: (preset: EquipmentPreset) => void;
  setDaysPerWeek: (days: number) => void;
  setStartDate: (isoDate: string) => void;
  setTargetMovement: (id: string, name: string) => void;
  set1rm: (kg: number | null, source?: "history" | "none" | null) => void;
  setTrainingAge: (age: TrainingAge) => void;
  setMaxDuration: (weeks: number) => void;
  setCustomTitle: (title: string) => void;
  goNext: () => void;
  goPrev: () => void;
  submit: (token: string) => Promise<void>;
  retry: () => void;
  abort: () => void;
  buildSubmitPayload: () => CreatePlanRequest;
}

export function usePlanWizard(): UsePlanWizardReturn {
  // Lazy initializer — `startDate` must be resolved at mount time, not at
  // module load time. The `initialState` constant above is only a shape
  // template; freezing "today" into it once at import would make every
  // wizard instance (and every test that mocks the system clock after
  // import) inherit whatever date happened to be current when the module
  // first loaded.
  const [state, setState] = useState<WizardState>(() => ({
    ...initialState,
    startDate: localDateString(new Date()),
  }));

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

  const setStartDate = useCallback((isoDate: string) => {
    setState((s) => ({ ...s, startDate: isoDate }));
  }, []);

  const setTargetMovement = useCallback((id: string, name: string) => {
    setState((s) => ({
      ...s,
      targetMovementId: id,
      targetMovementName: name,
    }));
  }, []);

  const set1rm = useCallback(
    (kg: number | null, source: "history" | "none" | null = null) => {
      setState((s) => ({ ...s, current1rmKg: kg, current1rmSource: source }));
    },
    [],
  );

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
      start_date: s.startDate,
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
      setState((s) => ({
        ...s,
        isSubmitting: true,
        error: null,
        rateLimited: false,
        timedOut: false,
        taskStatus: "pending",
      }));

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const payload = buildSubmitPayload();
        const task = await api.plans.create(token, payload, {
          signal: controller.signal,
        });

        // Poll the task until complete (max 12 attempts, 5s interval — 02 §3).
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
              taskStatus: "complete",
            }));
            return;
          }

          if (latest.status === "failed") {
            setState((s) => ({
              ...s,
              error: latest.error ?? "Plan generation failed.",
              isSubmitting: false,
              taskStatus: "failed",
            }));
            return;
          }

          setState((s) => ({ ...s, taskStatus: latest.status }));
          attempts++;
        }

        // 12th poll with no terminal state — the job may still finish
        // server-side even though the client stopped watching (02 §3).
        setState((s) => ({
          ...s,
          timedOut: true,
          isSubmitting: false,
        }));
      } catch (err) {
        if (controller.signal.aborted || (err as Error).name === "AbortError")
          return;
        if (err instanceof ApiError && err.status === 429) {
          setState((s) => ({
            ...s,
            rateLimited: true,
            isSubmitting: false,
            taskStatus: null,
          }));
          return;
        }
        setState((s) => ({
          ...s,
          error: "Failed to create plan.",
          isSubmitting: false,
          taskStatus: null,
        }));
      } finally {
        submittingRef.current = false;
      }
    },
    [buildSubmitPayload],
  );

  // "Try again" from the failed/rate-limited/timed-out generation state —
  // returns to wizard step 5 with all inputs preserved (02 §3), clearing
  // only the terminal-state flags.
  const retry = useCallback(() => {
    setState((s) => ({
      ...s,
      error: null,
      rateLimited: false,
      timedOut: false,
      taskStatus: null,
      isSubmitting: false,
    }));
  }, []);

  return {
    state,
    setArchetype,
    togglePreset,
    setDaysPerWeek,
    setStartDate,
    setTargetMovement,
    set1rm,
    setTrainingAge,
    setMaxDuration,
    setCustomTitle,
    goNext,
    goPrev,
    submit,
    retry,
    abort,
    buildSubmitPayload,
  };
}
