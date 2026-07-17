"use client";

import { useState } from "react";
import { generatePlanTitle } from "@/lib/plans/titles";
import type { TrainingAge, WizardState } from "@/lib/types/plans";

interface TrainingAgeOption {
  value: TrainingAge;
  label: string;
  tooltip: string;
}

const TRAINING_AGE_OPTIONS: TrainingAgeOption[] = [
  {
    value: "beginner",
    label: "Beginner",
    tooltip: "< 1 year of consistent training or new to structured programming",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    tooltip: "1–3 years, comfortable with foundational movements",
  },
  {
    value: "advanced",
    label: "Advanced",
    tooltip: "3+ years, competent with all major movement patterns",
  },
];

interface Props {
  state: WizardState;
  onAgeSelect: (age: TrainingAge) => void;
  onTitleChange: (title: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  error: string | null;
}

export function TrainingAgeStep({
  state,
  onAgeSelect,
  onTitleChange,
  onSubmit,
  isSubmitting,
  error,
}: Props) {
  // When null the title is auto-derived from the archetype + training age.
  // Once the user types in the field it becomes a controlled string.
  // Selecting a new training age resets this back to null so the field
  // auto-regenerates — the user can re-edit if they want.
  const [customTitle, setCustomTitle] = useState<string | null>(null);

  // Derive the visible title without an effect: prefer the user's custom
  // override, otherwise generate from the current wizard state.
  function derivedTitle(): string {
    if (customTitle !== null) return customTitle;
    if (!state.archetype || !state.trainingAge) return "";
    return generatePlanTitle(
      state.archetype,
      state.trainingAge,
      state.targetMovementName,
    );
  }

  function handleAgeSelect(age: TrainingAge) {
    // Changing age resets any custom title so the field auto-regenerates.
    setCustomTitle(null);
    onAgeSelect(age);
    // Notify parent with the freshly-generated title for this age.
    if (state.archetype) {
      const generated = generatePlanTitle(
        state.archetype,
        age,
        state.targetMovementName,
      );
      onTitleChange(generated);
    }
  }

  function handleTitleChange(value: string) {
    setCustomTitle(value);
    onTitleChange(value);
  }

  const titleValue = derivedTitle();
  const titleDirty = customTitle !== null;
  const canSubmit = state.trainingAge !== null && !isSubmitting;

  return (
    <div className="flex flex-col gap-6">
      {/* Step header */}
      <div>
        <h2
          className="font-mono text-sm font-semibold"
          style={{ color: "var(--text)" }}
        >
          step 5 &mdash; training age
        </h2>
        <p className="mt-1 font-mono text-xs" style={{ color: "var(--muted)" }}>
          how long have you been training consistently?
        </p>
      </div>

      {/* Segmented control */}
      <div
        role="radiogroup"
        aria-label="Training age"
        className="grid grid-cols-3 gap-3"
      >
        {TRAINING_AGE_OPTIONS.map(({ value, label, tooltip }) => {
          const isSelected = state.trainingAge === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              title={tooltip}
              data-testid={`training-age-${value}`}
              onClick={() => handleAgeSelect(value)}
              className="rounded-lg border p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              style={{
                minHeight: "44px",
                borderColor: isSelected ? "var(--accent)" : "var(--border)",
                backgroundColor: isSelected
                  ? "rgba(74, 222, 128, 0.08)"
                  : "var(--surface)",
                color: isSelected ? "var(--text)" : "var(--muted)",
                cursor: "pointer",
              }}
            >
              <span className="font-mono text-sm font-semibold block">
                {label}
              </span>
              <span
                className="font-mono text-xs leading-snug mt-1 block"
                style={{ color: "var(--muted)" }}
              >
                {tooltip}
              </span>
            </button>
          );
        })}
      </div>

      {/* Auto-title preview */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="plan-title"
          className="font-mono text-xs font-semibold"
          style={{ color: "var(--muted)" }}
        >
          plan title
        </label>
        <input
          id="plan-title"
          type="text"
          data-testid="plan-title-input"
          value={titleValue}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder={
            state.trainingAge ? "" : "select a training age to generate title"
          }
          className="w-full rounded border font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
            color: "var(--text)",
            padding: "8px 12px",
            minHeight: "44px",
          }}
        />
        {!titleDirty && state.trainingAge && (
          <p className="font-mono text-xs" style={{ color: "var(--muted)" }}>
            auto-generated &mdash; edit to customise
          </p>
        )}
        {titleDirty && (
          <p className="font-mono text-xs" style={{ color: "var(--muted)" }}>
            custom title
          </p>
        )}
      </div>

      {/* Submit */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          data-testid="commit-plan-btn"
          className="rounded font-mono text-sm font-semibold transition-opacity"
          style={{
            backgroundColor: "var(--accent)",
            color: "var(--bg)",
            padding: "10px 24px",
            minHeight: "44px",
            opacity: canSubmit ? 1 : 0.4,
            cursor: canSubmit ? "pointer" : "not-allowed",
            border: "none",
            alignSelf: "flex-start",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {isSubmitting && (
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              style={{
                animation: "spin 1s linear infinite",
              }}
            >
              <circle
                cx="7"
                cy="7"
                r="6"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="28"
                strokeDashoffset="10"
                strokeLinecap="round"
              />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </svg>
          )}
          {isSubmitting ? "committing..." : "commit plan"}
        </button>

        {error && (
          <p
            role="alert"
            data-testid="submit-error"
            className="font-mono text-xs"
            style={{ color: "var(--red)" }}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
