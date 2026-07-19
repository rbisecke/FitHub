interface Props {
  step: number;
  totalSteps: number;
}

// Flow-research pattern 1 (08 §2 "Progress & step signaling"): an explicit,
// named/numbered step count beats an ambiguous bar alone, so the dot fill is
// paired with a visible "N of totalSteps" text label (not just the
// aria-valuenow/aria-valuemax pair, which only reaches screen readers).
export function OnboardingProgress({ step, totalSteps }: Props) {
  return (
    <div className="flex flex-1 items-center gap-3">
      <div
        className="flex flex-1 gap-1.5"
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={0}
        aria-valuemax={totalSteps}
        aria-valuetext={`Step ${step} of ${totalSteps}`}
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
      <span
        aria-hidden="true"
        className="font-mono text-[11px] whitespace-nowrap text-[var(--muted)]"
      >
        {step} of {totalSteps}
      </span>
    </div>
  );
}
