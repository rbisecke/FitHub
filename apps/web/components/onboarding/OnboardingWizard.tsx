"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import type { UserProfile, WeightUnit, DistanceUnit } from "@/lib/api";
import { OnboardingProgress } from "./OnboardingProgress";
import { Step1Welcome } from "./Step1Welcome";
import { Step2Frequency } from "./Step2Frequency";
import { Step3Units } from "./Step3Units";
import { Step4FirstWorkout } from "./Step4FirstWorkout";
import { Step5Done } from "./Step5Done";

const PROGRESS_STEPS = 4; // steps 2-5 each get a dot

interface Props {
  step: number;
  token: string;
  profile: UserProfile;
}

export function OnboardingWizard({ step, token, profile }: Props) {
  const router = useRouter();

  function goTo(s: number) {
    router.push(`/onboarding/${s}`);
  }

  async function skipAll() {
    try {
      await api.profile.patch(token, { onboarding_completed: true });
    } catch {
      // best-effort
    }
    router.push("/dashboard");
  }

  async function finishStep2(frequencyTargetDays: number) {
    await api.profile.patch(token, {
      frequency_target_days: frequencyTargetDays,
    });
    goTo(3);
  }

  async function finishStep3(units: {
    weight: WeightUnit;
    distance: DistanceUnit;
  }) {
    await api.profile.patch(token, {
      weight_unit: units.weight,
      distance_unit: units.distance,
    });
    goTo(4);
  }

  async function finish() {
    try {
      await api.profile.patch(token, { onboarding_completed: true });
    } catch {
      // best-effort
    }
    router.push("/dashboard");
  }

  const showBack = step > 1 && step < 5;
  const progressStep = step > 1 ? step - 1 : 0;

  return (
    <div className="mx-auto flex w-full max-w-[540px] flex-1 flex-col px-[22px] pb-12 pt-[28px]">
      {/* Top bar: back arrow + progress dots (steps 2-5 only) */}
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
        <Step2Frequency
          defaultValue={profile.frequency_target_days}
          onNext={finishStep2}
        />
      )}
      {step === 3 && (
        <Step3Units
          defaultWeightUnit={profile.weight_unit}
          defaultDistanceUnit={profile.distance_unit}
          onNext={finishStep3}
        />
      )}
      {step === 4 && (
        <Step4FirstWorkout
          token={token}
          onNext={() => goTo(5)}
          onSkip={() => goTo(5)}
          onBack={() => goTo(3)}
        />
      )}
      {step === 5 && <Step5Done onFinish={finish} />}
    </div>
  );
}
