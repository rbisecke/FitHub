"use client";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  "aria-label": string;
  disabled?: boolean;
}

export function ToggleSwitch({
  checked,
  onChange,
  "aria-label": ariaLabel,
  disabled = false,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex items-center w-[44px] h-[24px] rounded-full border-0 transition-colors duration-200 shrink-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
        checked ? "bg-[var(--accent)]" : "bg-[var(--border)]",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      <span
        className={[
          "absolute w-[20px] h-[20px] bg-white rounded-full shadow-sm transition-transform duration-200",
          checked ? "translate-x-[22px]" : "translate-x-[2px]",
        ].join(" ")}
      />
    </button>
  );
}
