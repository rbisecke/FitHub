"use client";

import { useState, useEffect } from "react";
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

const INTENSITY_OPTIONS = ["Conservative", "Moderate", "Aggressive"] as const;
type IntensityBias = (typeof INTENSITY_OPTIONS)[number];

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
  // Track whether user has manually edited the title. Once they do, stop
  // auto-regenerating on training age changes.
  const [titleDirty, setTitleDirty] = useState(false);
  const [localTitle, setLocalTitle] = useState<string>("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [injuryNotes, setInjuryNotes] = useState("");
  const [intensityBias, setIntensityBias] = useState<IntensityBias>("Moderate");

  // Regenerate title whenever training age changes, unless the user already
  // hand-edited it.
  useEffect(() => {
    if (titleDirty) return;
    if (!state.trainingAge || !state.archetype) return;
    const generated = generatePlanTitle(
      state.archetype,
      state.trainingAge,
      state.targetMovementName,
    );
    setLocalTitle(generated);
    onTitleChange(generated);
    // onTitleChange identity is stable (useCallback in parent); safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.trainingAge,
    state.archetype,
    state.targetMovementName,
    titleDirty,
  ]);

  function handleAgeSelect(age: TrainingAge) {
    onAgeSelect(age);
  }

  function handleTitleChange(value: string) {
    setLocalTitle(value);
    setTitleDirty(true);
    onTitleChange(value);
  }

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
              aria-pressed={isSelected}
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
          value={localTitle}
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

      {/* Advanced settings accordion */}
      <div
        className="rounded-lg border"
        style={{ borderColor: "var(--border)" }}
      >
        <button
          type="button"
          onClick={() => setAdvancedOpen((prev) => !prev)}
          aria-expanded={advancedOpen}
          aria-controls="advanced-settings-panel"
          aria-label="Toggle advanced settings"
          className="flex w-full items-center justify-between p-4 font-mono text-sm transition-colors"
          style={{
            color: "var(--muted)",
            background: "none",
            border: "none",
            cursor: "pointer",
            minHeight: "44px",
          }}
        >
          <span>advanced settings</span>
          <span
            style={{
              display: "inline-block",
              transform: advancedOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 150ms ease",
            }}
            aria-hidden="true"
          >
            ▾
          </span>
        </button>

        {advancedOpen && (
          <div
            id="advanced-settings-panel"
            className="flex flex-col gap-6 px-4 pb-4"
            data-testid="advanced-settings-panel"
          >
            {/* Injury notes */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="injury-notes"
                className="font-mono text-xs font-semibold"
                style={{ color: "var(--muted)" }}
              >
                notes for the AI coach{" "}
                <span className="font-normal">(optional)</span>
              </label>
              <textarea
                id="injury-notes"
                data-testid="injury-notes"
                value={injuryNotes}
                onChange={(e) => setInjuryNotes(e.target.value)}
                placeholder="e.g. avoiding overhead press due to shoulder impingement"
                rows={3}
                className="w-full rounded border font-mono text-xs resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                  padding: "8px 12px",
                }}
              />
            </div>

            {/* Intensity bias */}
            <fieldset className="flex flex-col gap-3">
              <legend
                className="font-mono text-xs font-semibold"
                style={{ color: "var(--muted)" }}
              >
                intensity bias
              </legend>
              <div className="flex gap-4">
                {INTENSITY_OPTIONS.map((option) => {
                  const isSelected = intensityBias === option;
                  return (
                    <label
                      key={option}
                      className="flex items-center gap-2 cursor-pointer font-mono text-xs"
                      style={{
                        color: isSelected ? "var(--text)" : "var(--muted)",
                      }}
                    >
                      <input
                        type="radio"
                        name="intensity-bias"
                        value={option}
                        checked={isSelected}
                        onChange={() => setIntensityBias(option)}
                        data-testid={`intensity-${option.toLowerCase()}`}
                        style={{ accentColor: "var(--accent)" }}
                      />
                      {option}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>
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
