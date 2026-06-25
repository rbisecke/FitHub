import { Progress } from "@/components/ui/progress";

interface Props {
  step: number;
  totalSteps: number;
}

export function OnboardingProgress({ step, totalSteps }: Props) {
  const pct = Math.round((step / totalSteps) * 100);
  return (
    <div className="w-full">
      <Progress
        value={pct}
        className="h-1.5 rounded-none bg-[#30363d] [&>div]:bg-[#58a6ff]"
        aria-label="Onboarding progress"
      />
      <div className="px-6 pb-0 pt-3">
        <span aria-live="polite" className="font-mono text-xs text-[#8b949e]">
          {step} of {totalSteps}
        </span>
      </div>
    </div>
  );
}
