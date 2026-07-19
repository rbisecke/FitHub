"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import type {
  UserProfile,
  WeightUnit,
  DistanceUnit,
  PrimaryGoal,
  EquipmentAccess,
} from "@/lib/api";
import { toWeightUnit, toDistanceUnit } from "@/lib/api";
import type { TrainingAge } from "@/lib/types/plans";
import { OnboardingProgress } from "./OnboardingProgress";
import { Step1Welcome } from "./Step1Welcome";
import { Step2Goal } from "./Step2Goal";
import { Step3TrainingExperience } from "./Step3TrainingExperience";
import { Step4Equipment } from "./Step4Equipment";
import { Step5Frequency } from "./Step5Frequency";
import { Step6Units } from "./Step6Units";
import { Step7FirstAction } from "./Step7FirstAction";
import { Step8Done } from "./Step8Done";

// Steps 2-8 each get a dot; the counter reads "N of 7" (step 2 = "1 of 7",
// step 8 = "7 of 7" — the summary is counted as the final step, not an
// off-counter payoff, per 08 §2).
const PROGRESS_STEPS = 7;

// training_age has no UserProfile column to persist to yet (only
// public.plans carries it) — bridged across the wizard's per-step route
// navigations via sessionStorage rather than React state, since each step
// is a distinct route and remounts OnboardingWizard on every step change.
const TRAINING_AGE_STORAGE_KEY = "fithub-onboarding-training-age";

function readStoredTrainingAge(): TrainingAge | null {
  const value = window.sessionStorage.getItem(TRAINING_AGE_STORAGE_KEY);
  return value === "beginner" ||
    value === "intermediate" ||
    value === "advanced"
    ? value
    : null;
}

// No-op subscribe: within a single mount there is only one writer (this same
// wizard, via finishStep3 below) and a write is always followed by a full
// route navigation that remounts the component and re-reads the snapshot, so
// there is nothing to subscribe to for in-place updates.
function subscribeNoop() {
  return () => {};
}

function getServerSnapshot(): TrainingAge | null {
  return null;
}

interface Props {
  step: number;
  token: string;
  profile: UserProfile;
}

export function OnboardingWizard({ step, token, profile }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  // getServerSnapshot returns null so SSR/pre-hydration markup matches the
  // client; the real sessionStorage value resolves right after hydration
  // with no extra render-triggering effect (avoids both a hydration
  // mismatch and a synchronous setState-in-effect).
  const trainingAge = useSyncExternalStore(
    subscribeNoop,
    readStoredTrainingAge,
    getServerSnapshot,
  );

  // Step 1 (Welcome) is the canonical fresh-start entry point for every run
  // of the wizard. Clear any stale sessionStorage value on mount so a second
  // user reusing the same tab/browser (e.g. logout then a different account
  // signing in) never inherits a prior user's unsaved training-age answer.
  useEffect(() => {
    if (step === 1) {
      window.sessionStorage.removeItem(TRAINING_AGE_STORAGE_KEY);
    }
  }, [step]);

  function goTo(s: number) {
    setError(null);
    router.push(`/onboarding/${s}`);
  }

  async function skipAll() {
    try {
      await api.profile.patch(token, { onboarding_completed: true });
    } catch {
      // best-effort
    }
    window.sessionStorage.removeItem(TRAINING_AGE_STORAGE_KEY);
    router.push("/dashboard");
  }

  async function finishStep2(goal: PrimaryGoal) {
    try {
      await api.profile.patch(token, { primary_goal: goal });
      goTo(3);
    } catch {
      setError("Failed to save preferences. Please try again.");
    }
  }

  function finishStep3(age: TrainingAge) {
    window.sessionStorage.setItem(TRAINING_AGE_STORAGE_KEY, age);
    goTo(4);
  }

  async function finishStep4(equipment: EquipmentAccess[]) {
    try {
      await api.profile.patch(token, { equipment_access: equipment });
      goTo(5);
    } catch {
      setError("Failed to save preferences. Please try again.");
    }
  }

  async function finishStep5(frequencyTargetDays: number) {
    try {
      await api.profile.patch(token, {
        frequency_target_days: frequencyTargetDays,
      });
      goTo(6);
    } catch {
      setError("Failed to save preferences. Please try again.");
    }
  }

  async function finishStep6(units: {
    weight: WeightUnit;
    distance: DistanceUnit;
  }) {
    try {
      await api.profile.patch(token, {
        weight_unit: units.weight,
        distance_unit: units.distance,
      });
      goTo(7);
    } catch {
      setError("Failed to save preferences. Please try again.");
    }
  }

  async function finish() {
    try {
      await api.profile.patch(token, { onboarding_completed: true });
    } catch {
      // best-effort
    }
    window.sessionStorage.removeItem(TRAINING_AGE_STORAGE_KEY);
    router.push("/dashboard");
  }

  const showBack = step > 1 && step < 8;
  const progressStep = step > 1 ? step - 1 : 0;

  return (
    <div className="mx-auto flex w-full max-w-[540px] flex-1 flex-col px-[22px] pb-12 pt-[28px]">
      {/* Top bar: back arrow + progress dots (steps 2-8 only) */}
      {step > 1 && (
        <div className="mb-[34px] flex items-center gap-3.5">
          {showBack && (
            <button
              onClick={() => goTo(step - 1)}
              className="p-0 text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
              aria-label="Go back"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
          )}
          <OnboardingProgress step={progressStep} totalSteps={PROGRESS_STEPS} />
        </div>
      )}

      {step === 1 && (
        <Step1Welcome onStart={() => goTo(2)} onSkipAll={skipAll} />
      )}
      {step === 2 && (
        <Step2Goal
          defaultValue={profile.primary_goal ?? null}
          onNext={finishStep2}
        />
      )}
      {step === 3 && (
        <Step3TrainingExperience
          defaultValue={trainingAge}
          onNext={finishStep3}
        />
      )}
      {step === 4 && (
        <Step4Equipment
          defaultValue={profile.equipment_access ?? []}
          onNext={finishStep4}
        />
      )}
      {step === 5 && (
        <Step5Frequency
          defaultValue={profile.frequency_target_days}
          onNext={finishStep5}
        />
      )}
      {step === 6 && (
        <Step6Units
          defaultWeightUnit={toWeightUnit(profile.weight_unit)}
          defaultDistanceUnit={toDistanceUnit(profile.distance_unit)}
          onNext={finishStep6}
        />
      )}
      {step === 7 && <Step7FirstAction token={token} onSkip={() => goTo(8)} />}
      {step === 8 && (
        <Step8Done
          onFinish={finish}
          goal={profile.primary_goal ?? null}
          trainingAge={trainingAge}
          equipment={profile.equipment_access ?? []}
          frequencyTargetDays={profile.frequency_target_days}
          weightUnit={toWeightUnit(profile.weight_unit)}
          distanceUnit={toDistanceUnit(profile.distance_unit)}
        />
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-[var(--red)]">
          {error}
        </p>
      )}
    </div>
  );
}
