"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import type { UserProfile } from "@/lib/api";
import { OnboardingProgress } from "./OnboardingProgress";
import { Step1Welcome } from "./Step1Welcome";
import { Step2Frequency } from "./Step2Frequency";
import { Step3Units } from "./Step3Units";
import { Step4FirstWorkout } from "./Step4FirstWorkout";
import { Step5Done } from "./Step5Done";

const TOTAL = 4; // steps 2-5 show progress (step 1 is pre-progress)

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

  async function finishStep3(weightUnit: "kg" | "lb") {
    await api.profile.patch(token, { weight_unit: weightUnit });
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

  if (step === 1) {
    return <Step1Welcome onStart={() => goTo(2)} onSkipAll={skipAll} />;
  }

  const progressStep = step - 1; // steps 2-5 map to progress 1-4

  return (
    <div className="flex flex-col">
      <OnboardingProgress step={progressStep} totalSteps={TOTAL} />

      {step === 2 && (
        <Step2Frequency
          defaultValue={profile.frequency_target_days}
          onNext={finishStep2}
          onBack={() => goTo(1)}
        />
      )}

      {step === 3 && (
        <Step3Units
          defaultValue={profile.weight_unit}
          onNext={finishStep3}
          onBack={() => goTo(2)}
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
