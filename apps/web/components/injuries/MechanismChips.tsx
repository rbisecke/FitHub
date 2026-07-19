"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type Mechanism = "overuse" | "acute" | "unknown";

const OPTIONS: { value: Mechanism; label: string }[] = [
  { value: "overuse", label: "Overuse" },
  { value: "acute", label: "Acute" },
  { value: "unknown", label: "Unknown" },
];

/**
 * Mechanism chips (05 §1.2) — optional, single-select, defaulting to none
 * selected. Full-surface selected fill per the Bible's §1.4 state-fill rule.
 */
export function MechanismChips({
  value,
  onChange,
}: {
  value: Mechanism | null;
  onChange: (mechanism: Mechanism | null) => void;
}) {
  return (
    <div>
      <p
        className="mb-2 font-sans text-[13px] font-semibold"
        style={{ color: "var(--text)" }}
      >
        Mechanism{" "}
        <span
          className="font-sans text-[11px] font-normal"
          style={{ color: "var(--muted)" }}
        >
          (optional)
        </span>
      </p>
      <ToggleGroup
        value={value ? [value] : []}
        onValueChange={(vals) => {
          const next = vals[0];
          onChange(
            next === "overuse" || next === "acute" || next === "unknown"
              ? next
              : null,
          );
        }}
        aria-label="How the injury happened"
      >
        {OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <ToggleGroupItem
              key={opt.value}
              value={opt.value}
              aria-label={opt.label}
              className="min-h-11 rounded-[8px] px-4 font-sans text-[13px]"
              style={{
                background: selected ? "var(--accent)" : "var(--surface)",
                color: selected ? "var(--bg)" : "var(--text)",
                border: `1px solid ${
                  selected ? "var(--accent)" : "var(--border)"
                }`,
              }}
            >
              {opt.label}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
