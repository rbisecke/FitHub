const WINDOW_OPTIONS = [7, 30, 90, 180, 365] as const;

/**
 * Window control (design-spec 04 Screen 4): configurable 7–365 days, default
 * 90. Segmented-vs-dropdown is flagged as genuinely unresolved in the design
 * doc's own research (TrainingPeaks help pages 403'd during the research
 * pass) — this builds a segmented control per the doc's instruction to
 * "build segmented and flag it," not a permanent design decision. If a future
 * pass wants to A/B a `Select` dropdown instead, this is the file to swap.
 */
export function WindowControl({
  days,
  onChange,
}: {
  days: number;
  onChange: (days: number) => void;
}) {
  return (
    <div
      className="inline-flex gap-[2px] rounded-[10px] border border-[var(--border)] bg-[var(--secondary)] p-[3px]"
      role="group"
      aria-label="Load model time window"
    >
      {WINDOW_OPTIONS.map((opt) => {
        const isActive = days === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            aria-pressed={isActive}
            className="font-mono text-[12px] font-bold px-3 py-1.5 rounded-[8px] whitespace-nowrap transition-colors"
            style={
              isActive
                ? {
                    background: "var(--accent)",
                    color: "var(--primary-foreground)",
                  }
                : {
                    background: "transparent",
                    color: "var(--muted-foreground)",
                  }
            }
          >
            {opt}d
          </button>
        );
      })}
    </div>
  );
}
