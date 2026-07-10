"use client";

import { useState } from "react";
import {
  EQUIPMENT_PRESET_TAGS,
  resolveEquipmentTags,
} from "@/lib/plans/equipment";
import type { EquipmentPreset, WizardState } from "@/lib/types/plans";

const PRESETS: EquipmentPreset[] = [
  "Full Gym",
  "Home Setup",
  "Barbell Only",
  "Travel",
  "Bodyweight",
];

interface Props {
  state: WizardState;
  onUpdate: (presets: Set<EquipmentPreset>) => void;
  onNext: () => void;
}

export function EquipmentStep({ state, onUpdate, onNext }: Props) {
  const [expanded, setExpanded] = useState<Set<EquipmentPreset>>(new Set());

  const selectedPresets = state.selectedPresets;
  const isFullGym = selectedPresets.has("Full Gym");

  function togglePreset(preset: EquipmentPreset) {
    const next = new Set(selectedPresets);
    if (preset === "Full Gym") {
      if (next.has("Full Gym")) {
        // Deselect Full Gym — unlock all others but leave them unchecked
        next.clear();
      } else {
        // Select Full Gym — auto-check all presets
        for (const p of PRESETS) {
          next.add(p);
        }
      }
    } else {
      if (next.has(preset)) {
        next.delete(preset);
      } else {
        next.add(preset);
      }
    }
    onUpdate(next);
  }

  function toggleExpand(preset: EquipmentPreset) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(preset)) {
        next.delete(preset);
      } else {
        next.add(preset);
      }
      return next;
    });
  }

  const resolvedTags = resolveEquipmentTags(selectedPresets);
  const canContinue = selectedPresets.size > 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2
          className="font-mono text-sm font-semibold"
          style={{ color: "var(--text)" }}
        >
          step 2 &mdash; equipment
        </h2>
        <p className="mt-1 font-mono text-xs" style={{ color: "var(--muted)" }}>
          select all that apply to your training space
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {PRESETS.map((preset) => {
          const isSelected = selectedPresets.has(preset);
          const isLocked = isFullGym && preset !== "Full Gym";
          const isOpen = expanded.has(preset);
          const tags = EQUIPMENT_PRESET_TAGS[preset];

          return (
            <div
              key={preset}
              className="rounded-lg border transition-colors"
              style={{
                borderColor: isSelected ? "var(--accent)" : "var(--border)",
                backgroundColor: isSelected
                  ? "rgba(88, 166, 255, 0.08)"
                  : "var(--surface)",
                opacity: isLocked ? 0.6 : 1,
              }}
            >
              {/* Main tile row */}
              <div
                className="flex items-center gap-3 p-4"
                style={{ minHeight: "44px" }}
              >
                {/* Checkbox */}
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isSelected}
                  aria-label={`Select ${preset}`}
                  disabled={isLocked}
                  onClick={() => !isLocked && togglePreset(preset)}
                  className="flex shrink-0 items-center justify-center rounded"
                  style={{
                    width: "20px",
                    height: "20px",
                    minWidth: "20px",
                    border: isSelected
                      ? "2px solid var(--accent)"
                      : "2px solid var(--border)",
                    backgroundColor: isSelected
                      ? "var(--accent)"
                      : "transparent",
                    cursor: isLocked ? "not-allowed" : "pointer",
                  }}
                >
                  {isSelected && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="var(--bg)"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>

                {/* Label area — clicking toggles selection */}
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => !isLocked && togglePreset(preset)}
                  className="flex-1 text-left"
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: isLocked ? "not-allowed" : "pointer",
                    minHeight: "44px",
                    display: "flex",
                    alignItems: "center",
                  }}
                  aria-label={`Toggle ${preset}`}
                >
                  <span
                    className="font-mono text-sm font-semibold"
                    style={{ color: isLocked ? "var(--muted)" : "var(--text)" }}
                  >
                    {preset}
                  </span>
                </button>

                {/* Expand toggle */}
                <button
                  type="button"
                  onClick={() => toggleExpand(preset)}
                  aria-expanded={isOpen}
                  aria-label={`${
                    isOpen ? "Hide" : "See"
                  } what's included in ${preset}`}
                  className="font-mono text-xs transition-colors"
                  style={{
                    background: "none",
                    border: "none",
                    padding: "4px 0",
                    cursor: "pointer",
                    color: "var(--muted)",
                    whiteSpace: "nowrap",
                    minHeight: "44px",
                    display: "flex",
                    alignItems: "center",
                    gap: "2px",
                  }}
                >
                  see what&apos;s included
                  <span
                    style={{
                      display: "inline-block",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 150ms ease",
                    }}
                    aria-hidden="true"
                  >
                    ▾
                  </span>
                </button>
              </div>

              {/* Expanded tag list */}
              {isOpen && (
                <div className="px-4 pb-4" data-testid={`tags-${preset}`}>
                  <p
                    className="font-mono text-xs"
                    style={{ color: "var(--muted)" }}
                  >
                    {tags.join(", ")}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Resolved tag count footer */}
      <p
        className="font-mono text-xs"
        style={{ color: "var(--muted)" }}
        data-testid="tag-count"
      >
        {resolvedTags.length} equipment tag
        {resolvedTags.length !== 1 ? "s" : ""} selected
      </p>

      {/* Continue button */}
      <button
        type="button"
        onClick={onNext}
        disabled={!canContinue}
        data-testid="continue-btn"
        className="rounded font-mono text-sm transition-opacity"
        style={{
          backgroundColor: "var(--accent)",
          color: "var(--bg)",
          padding: "10px 24px",
          minHeight: "44px",
          opacity: canContinue ? 1 : 0.4,
          cursor: canContinue ? "pointer" : "not-allowed",
          border: "none",
          alignSelf: "flex-start",
        }}
      >
        continue
      </button>
    </div>
  );
}
