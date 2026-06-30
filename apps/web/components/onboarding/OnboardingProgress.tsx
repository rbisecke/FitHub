interface Props {
  step: number;
  totalSteps: number;
}

export function OnboardingProgress({ step, totalSteps }: Props) {
  return (
    <div
      className="flex flex-1 gap-1.5"
      role="progressbar"
      aria-valuenow={step}
      aria-valuemax={totalSteps}
    >
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className="h-[3px] rounded-full transition-all duration-300"
          style={{
            background: i < step ? "var(--accent)" : "var(--border)",
            flexBasis: i < step ? "24px" : "16px",
          }}
        />
      ))}
    </div>
  );
}
