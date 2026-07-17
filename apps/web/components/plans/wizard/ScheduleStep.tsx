"use client";

import type { WizardState } from "@/lib/types/plans";

const DAYS_OPTIONS = [2, 3, 4, 5, 6] as const;
const WEEKS_OPTIONS = [4, 8, 12, 16, 20, 24] as const;

interface ScheduleStepProps {
  state: WizardState;
  onDaysChange: (days: number) => void;
  onDurationChange: (weeks: number) => void;
  onNext: () => void;
}

export function ScheduleStep({
  state,
  onDaysChange,
  onDurationChange,
  onNext,
}: ScheduleStepProps) {
  const selectedDays = state.daysPerWeek;
  const selectedWeeks = state.maxDurationWeeks ?? 12;

  const isSkillAcquisition = state.archetype === "skill-acquisition";
  const weeksLabel = isSkillAcquisition
    ? "Max program duration (weeks)"
    : "Program length (weeks)";
  const weeksHelper = isSkillAcquisition
    ? "The AI will stop when the skill is achieved or time runs out."
    : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "32px",
      }}
    >
      {/* Days per week */}
      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <legend
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: "12px",
            display: "block",
          }}
        >
          Days per week
        </legend>
        <div
          data-testid="days-buttons"
          style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
        >
          {DAYS_OPTIONS.map((d) => {
            const active = selectedDays === d;
            return (
              <button
                key={d}
                type="button"
                aria-pressed={active}
                onClick={() => onDaysChange(d)}
                style={{
                  minWidth: "48px",
                  minHeight: "44px",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: `1px solid ${
                    active ? "var(--accent)" : "var(--border)"
                  }`,
                  backgroundColor: active ? "var(--accent)" : "var(--surface)",
                  color: active ? "var(--bg)" : "var(--text)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.9375rem",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: active ? 700 : 400,
                  cursor: "pointer",
                  transition:
                    "background-color 0.15s, color 0.15s, border-color 0.15s",
                }}
              >
                {d}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Weeks */}
      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <legend
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: "4px",
            display: "block",
          }}
        >
          {weeksLabel}
        </legend>
        {weeksHelper && (
          <p
            style={{
              fontSize: "0.8125rem",
              color: "var(--muted)",
              marginBottom: "12px",
              marginTop: 0,
            }}
          >
            {weeksHelper}
          </p>
        )}
        {!weeksHelper && <div style={{ marginBottom: "12px" }} />}
        {/* Prominent week count display */}
        <div style={{ marginBottom: "12px" }}>
          <span
            className="font-data tabular-nums text-[22px] font-bold"
            style={{ color: "var(--accent)" }}
          >
            {selectedWeeks}
          </span>{" "}
          <span
            className="font-sans text-[13px]"
            style={{ color: "var(--muted)" }}
          >
            weeks
          </span>
        </div>
        <div
          data-testid="weeks-buttons"
          style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
        >
          {WEEKS_OPTIONS.map((w) => {
            const active = selectedWeeks === w;
            return (
              <button
                key={w}
                type="button"
                aria-pressed={active}
                onClick={() => onDurationChange(w)}
                style={{
                  minWidth: "52px",
                  minHeight: "44px",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  border: `1px solid ${
                    active ? "var(--accent)" : "var(--border)"
                  }`,
                  backgroundColor: active ? "var(--accent)" : "var(--surface)",
                  color: active ? "var(--bg)" : "var(--text)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.9375rem",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: active ? 700 : 400,
                  cursor: "pointer",
                  transition:
                    "background-color 0.15s, color 0.15s, border-color 0.15s",
                }}
              >
                {w}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Continue */}
      <div style={{ paddingTop: "8px" }}>
        <button
          type="button"
          onClick={onNext}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "44px",
            padding: "10px 24px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "var(--text)",
            color: "var(--bg)",
            fontSize: "0.9375rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
