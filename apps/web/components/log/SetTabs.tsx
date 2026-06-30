"use client";

interface SetTab {
  label: string;
  index: number;
}

interface SetTabsProps {
  tabs: SetTab[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onAddSet: () => void;
}

/**
 * Set-selection tabs rendered as pill buttons.
 * Active tab: green accent background with dark text.
 * Inactive tab: surface-2 background, muted border.
 */
export function SetTabs({
  tabs,
  activeIndex,
  onSelect,
  onAddSet,
}: SetTabsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {tabs.map((tab) => (
        <button
          key={tab.index}
          type="button"
          onClick={() => onSelect(tab.index)}
          className={[
            "h-8 min-w-[36px] px-3 rounded-lg font-data text-[13px] transition-colors",
            tab.index === activeIndex
              ? "bg-[var(--accent)] text-[#0A0D12] font-bold"
              : "bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/40 hover:text-[var(--foreground)]",
          ].join(" ")}
        >
          {tab.label}
        </button>
      ))}
      <button
        type="button"
        onClick={onAddSet}
        className="h-8 px-3 rounded-lg font-data text-[13px] border border-dashed border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/60 hover:text-[var(--accent)] transition-colors"
      >
        + Add set
      </button>
    </div>
  );
}
