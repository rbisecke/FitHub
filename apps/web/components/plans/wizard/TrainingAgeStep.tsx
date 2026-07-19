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
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
}

export function TrainingAgeStep({
  state,
  onAgeSelect,
  onTitleChange,
  onSubmit,
  isSubmitting,
  error,
  headingRef,
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
    // Clear (not set) the parent's stored override. customTitle must only
    // ever be set from an actual user keystroke — pushing a freshly
    // generated string here would lock in a title baked with whatever
    // target movement is selected *right now*, which goes stale if the
    // user later back-navigates and changes the target movement without
    // re-clicking a training age. The parent's buildSubmitPayload derives
    // a fresh title from current state at submit time whenever
    // customTitle is null/empty, so clearing here is sufficient.
    onTitleChange("");
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
          ref={headingRef}
          tabIndex={-1}
          className="font-mono text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
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
                  ? "color-mix(in srgb, var(--accent) 8%, transparent)"
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
          <div className="flex items-center gap-2">
            <p className="font-mono text-xs" style={{ color: "var(--amber)" }}>
              custom title
            </p>
            <button
              type="button"
              data-testid="reset-title-btn"
              onClick={() => {
                setCustomTitle(null);
                onTitleChange("");
              }}
              className="font-mono text-xs underline-offset-2 hover:underline"
              style={{
                background: "none",
                border: "none",
                color: "var(--accent)",
                cursor: "pointer",
                padding: 0,
                minHeight: "44px",
              }}
            >
              ↺ use suggested
            </button>
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
