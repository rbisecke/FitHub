"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePlanWizard } from "@/hooks/usePlanWizard";
import { ArchetypeStep } from "@/components/plans/wizard/ArchetypeStep";
import { EquipmentStep } from "@/components/plans/wizard/EquipmentStep";
import { ScheduleStep } from "@/components/plans/wizard/ScheduleStep";
import { TargetMovementStep } from "@/components/plans/wizard/TargetMovementStep";
import { TrainingAgeStep } from "@/components/plans/wizard/TrainingAgeStep";
import { PlanGenerationScreen } from "@/components/plans/PlanGenerationScreen";
import type { ArchetypeSlug, EquipmentPreset } from "@/lib/types/plans";

// Archetypes that include a target-movement step (step index 3).
const NEEDS_TARGET_STEP = new Set<ArchetypeSlug>([
  "skill-acquisition",
  "one-rm-peak",
]);

function needsTargetStep(archetype: ArchetypeSlug | null): boolean {
  return archetype !== null && NEEDS_TARGET_STEP.has(archetype);
}

// Human-readable name for each internal step index, used to build the
// screen-reader step-transition announcement.
const STEP_NAMES: Record<number, string> = {
  0: "Choose Archetype",
  1: "Equipment",
  2: "Schedule",
  3: "Target Movement",
  4: "Training Age",
};

// Map internal step index (0–4) to the visible step position for a given archetype.
// For 4-step flow: 0→1, 1→2, 2→3, 4→4 (step 3 is hidden).
// For 5-step flow: 0→1, 1→2, 2→3, 3→4, 4→5.
function toDisplayStep(step: number, has5Steps: boolean): number {
  if (has5Steps) return step + 1;
  // 4-step flow: internal step 4 (TrainingAge) displays as step 4.
  if (step === 4) return 4;
  return step + 1;
}

interface StepDotProps {
  index: number;
  currentStep: number;
  totalSteps: number;
  has5Steps: boolean;
}

function StepDot({ index, currentStep, totalSteps, has5Steps }: StepDotProps) {
  // index is 1-based display position (1..totalSteps).
  // currentStep is the internal wizard step (0..4).
  const displayCurrent = toDisplayStep(currentStep, has5Steps);

  const isCompleted = index < displayCurrent;
  const isActive = index === displayCurrent;

  let bg: string;
  let border: string;
  let textColor: string;

  if (isCompleted) {
    bg = "var(--green)";
    border = "var(--green)";
    textColor = "var(--bg)";
  } else if (isActive) {
    bg = "var(--accent)";
    border = "var(--accent)";
    textColor = "var(--bg)";
  } else {
    bg = "transparent";
    border = "var(--border)";
    textColor = "var(--muted)";
  }

  return (
    <div className="flex items-center">
      <div
        aria-current={isActive ? "step" : undefined}
        aria-label={`Step ${index} of ${totalSteps}${
          isCompleted ? ", completed" : isActive ? ", current" : ""
        }`}
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "50%",
          border: `2px solid ${border}`,
          backgroundColor: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: textColor,
          fontFamily: "var(--font-mono)",
          fontSize: "0.75rem",
          fontWeight: 700,
          flexShrink: 0,
          transition: "background-color 0.15s, border-color 0.15s",
        }}
      >
        {isCompleted ? (
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 6l3 3 5-5"
              stroke="var(--bg)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          index
        )}
      </div>
      {index < totalSteps && (
        <div
          aria-hidden="true"
          style={{
            height: "2px",
            width: "32px",
            backgroundColor: isCompleted ? "var(--green)" : "var(--border)",
            transition: "background-color 0.15s",
          }}
        />
      )}
    </div>
  );
}

interface Props {
  accessToken: string;
}

export function CreatePlanWizard({ accessToken }: Props) {
  const router = useRouter();
  const redirectedRef = useRef(false);

  const wizard = usePlanWizard();
  const { state } = wizard;

  const has5Steps = needsTargetStep(state.archetype);
  const totalSteps = has5Steps ? 5 : 4;

  // Derived (not stored) so it always tracks state.step exactly — no extra
  // setState-in-effect render pass needed. Feeds the visually-hidden live
  // region below.
  const stepAnnouncement = `Step ${toDisplayStep(
    state.step,
    has5Steps,
  )} of ${totalSteps}: ${STEP_NAMES[state.step]}`;

  // Redirect when the plan is ready, guard against calling push more than once.
  useEffect(() => {
    if (state.planId && !redirectedRef.current) {
      redirectedRef.current = true;
      router.push(`/plan/${state.planId}`);
    }
  }, [state.planId, router]);

  // Move focus to the new step's heading on every transition — otherwise
  // focus silently falls back to document.body when the previous step's
  // focused element unmounts, forcing keyboard/screen-reader users to
  // re-discover their position via Tab from the top of the page after every
  // step. The visually-hidden live region below (rendered separately from
  // the step content) announces the same transition via stepAnnouncement,
  // which is derived from state.step above rather than stored, so it
  // updates in lockstep with focus without a second render pass.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [state.step]);

  // Stop any in-flight create/poll requests if the wizard unmounts (e.g. the
  // user navigates away mid-submit) so background polling doesn't keep firing
  // against a torn-down component.
  useEffect(() => wizard.abort, [wizard.abort]);

  // EquipmentStep expects a callback that receives the full Set, but
  // usePlanWizard exposes togglePreset(preset). Build a compatible adapter.
  function handleEquipmentUpdate(nextSet: Set<EquipmentPreset>) {
    // Compute the symmetric difference against the current selection and
    // toggle each changed preset so the hook's internal Set stays in sync.
    const current = state.selectedPresets;
    const allPresets: EquipmentPreset[] = [
      "Full Gym",
      "Home Setup",
      "Barbell Only",
      "Travel",
      "Bodyweight",
    ];
    for (const preset of allPresets) {
      const wasIn = current.has(preset);
      const isNowIn = nextSet.has(preset);
      if (wasIn !== isNowIn) {
        wizard.togglePreset(preset);
      }
    }
  }

  function handleTitleChange(title: string) {
    wizard.setCustomTitle(title);
  }

  function handleSubmit() {
    wizard.submit(accessToken);
  }

  // Once submit fires, the generation state replaces the wizard entirely
  // (02 §3 — "the wizard is unmounted"), including the failed/rate-limited/
  // timed-out terminal states. "Try again" (wizard.retry) returns here with
  // every prior input still intact, since none of the wizard's own state was
  // touched by submit().
  const showGeneration =
    state.isSubmitting ||
    state.error !== null ||
    state.rateLimited ||
    state.timedOut;

  if (showGeneration) {
    return <PlanGenerationScreen state={state} onRetry={wizard.retry} />;
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Step indicator */}
      <nav aria-label="Wizard progress">
        <div className="flex items-center">
          {Array.from({ length: totalSteps }, (_, i) => (
            <StepDot
              key={i}
              index={i + 1}
              currentStep={state.step}
              totalSteps={totalSteps}
              has5Steps={has5Steps}
            />
          ))}
        </div>
      </nav>

      {/* Visually-hidden live region — announces step transitions only.
          Kept separate from the step content below so ordinary in-step
          interactions (checkbox toggles, search results, etc.) don't
          trigger extra screen-reader announcements. Focus is additionally
          moved to the step heading via the headingRef effect above so
          keyboard users don't lose their place. */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {stepAnnouncement}
      </div>

      {/* Step content */}
      <div>
        {state.step === 0 && (
          <ArchetypeStep
            state={state}
            headingRef={headingRef}
            onSelect={(arch) => {
              wizard.setArchetype(arch);
              wizard.goNext();
            }}
          />
        )}

        {state.step === 1 && (
          <>
            <EquipmentStep
              state={state}
              headingRef={headingRef}
              onUpdate={handleEquipmentUpdate}
              onNext={wizard.goNext}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={wizard.goPrev}
                className="rounded font-mono text-sm transition-colors"
                style={{
                  border: "1px solid var(--border)",
                  background: "none",
                  color: "var(--muted)",
                  padding: "8px 16px",
                  minHeight: "44px",
                  cursor: "pointer",
                }}
              >
                back
              </button>
            </div>
          </>
        )}

        {state.step === 2 && (
          <>
            <ScheduleStep
              state={state}
              headingRef={headingRef}
              onDaysChange={wizard.setDaysPerWeek}
              onDurationChange={wizard.setMaxDuration}
              onStartDateChange={wizard.setStartDate}
              onNext={wizard.goNext}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={wizard.goPrev}
                className="rounded font-mono text-sm transition-colors"
                style={{
                  border: "1px solid var(--border)",
                  background: "none",
                  color: "var(--muted)",
                  padding: "8px 16px",
                  minHeight: "44px",
                  cursor: "pointer",
                }}
              >
                back
              </button>
            </div>
          </>
        )}

        {state.step === 3 && (
          // TargetMovementStep owns its own back/next navigation buttons.
          <TargetMovementStep
            state={state}
            accessToken={accessToken}
            headingRef={headingRef}
            onSelect={wizard.setTargetMovement}
            on1rmChange={(kg, source) => wizard.set1rm(kg, source)}
            onNext={wizard.goNext}
            onBack={wizard.goPrev}
          />
        )}

        {state.step === 4 && (
          <>
            {/* isSubmitting/error are always false/null here — showGeneration
                above intercepts the render the instant either becomes truthy
                and swaps in PlanGenerationScreen instead. Passed through
                anyway so TrainingAgeStep's own submitting/error UI stays
                correct if ever rendered standalone (e.g. in tests). */}
            <TrainingAgeStep
              state={state}
              headingRef={headingRef}
              onAgeSelect={wizard.setTrainingAge}
              onTitleChange={handleTitleChange}
              onSubmit={handleSubmit}
              isSubmitting={state.isSubmitting}
              error={state.error}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={wizard.goPrev}
                className="rounded font-mono text-sm transition-colors"
                style={{
                  border: "1px solid var(--border)",
                  background: "none",
                  color: "var(--muted)",
                  padding: "8px 16px",
                  minHeight: "44px",
                  cursor: "pointer",
                }}
              >
                back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
