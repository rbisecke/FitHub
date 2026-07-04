"use client";

import { useState } from "react";

// --- Conversion data ---

type DistanceKey = "400m" | "800m" | "1mile";

interface MachineRow {
  name: string;
  distance: string | null; // null = Assault Bike (calorie-only)
  calories: string;
}

const CONVERSION_DATA: Record<DistanceKey, MachineRow[]> = {
  "400m": [
    { name: "Row Erg", distance: "500 m", calories: "20 cal" },
    { name: "Ski Erg", distance: "400 m", calories: "20 cal" },
    { name: "C2 BikeErg", distance: "1,000 m", calories: "16 cal" },
    { name: "Assault Bike", distance: null, calories: "12–14 cal" },
  ],
  "800m": [
    { name: "Row Erg", distance: "1,000 m", calories: "40 cal" },
    { name: "Ski Erg", distance: "800 m", calories: "40 cal" },
    { name: "C2 BikeErg", distance: "2,000 m", calories: "32 cal" },
    { name: "Assault Bike", distance: null, calories: "25–28 cal" },
  ],
  "1mile": [
    { name: "Row Erg", distance: "2,000 m", calories: "80 cal" },
    { name: "Ski Erg", distance: "1,600 m", calories: "80 cal" },
    { name: "C2 BikeErg", distance: "4,000 m", calories: "64 cal" },
    { name: "Assault Bike", distance: null, calories: "50–56 cal" },
  ],
};

// --- Movement detection helpers (exported for testing) ---

/**
 * Extracts a canonical distance key from a movement name.
 * Returns null when the name is not a recognised cardio distance.
 */
export function extractRunDistance(name: string): DistanceKey | null {
  const lower = name.toLowerCase();
  // 1 mile check first to avoid partial match on "mile" after "800m"
  if (
    lower.includes("1 mile") ||
    lower.includes("1mile") ||
    lower.includes("1600m") ||
    lower.includes("1.0 mile") ||
    lower.includes("mile run")
  ) {
    return "1mile";
  }
  if (lower.includes("800m") || lower.includes("800 m")) return "800m";
  if (lower.includes("400m") || lower.includes("400 m")) return "400m";
  return null;
}

/** Returns true when the movement name looks like a running/cardio movement. */
export function isCardioMovement(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes("run") ||
    lower.includes("sprint") ||
    extractRunDistance(name) !== null
  );
}

/** Human-readable label for the panel header. */
function distanceLabel(key: DistanceKey): string {
  if (key === "1mile") return "1 Mile Run";
  return `${key} Run`;
}

// --- Panel component ---

interface CardioConversionPanelProps {
  /** Display name of the movement (e.g. "400m Run"). */
  movementName: string;
  distanceKey: DistanceKey;
  onClose: () => void;
}

type Tab = "distance" | "calories";

function CardioConversionPanel({
  movementName,
  distanceKey,
  onClose,
}: CardioConversionPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("distance");
  const rows = CONVERSION_DATA[distanceKey];

  return (
    <div
      data-testid="cardio-conversion-panel"
      className="mt-2 rounded-xl border p-4"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          {/* Swap icon */}
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 5h10M9 2l3 3-3 3M14 11H4M7 8l-3 3 3 3"
              stroke="var(--muted)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            className="font-sans text-[12px]"
            style={{ color: "var(--muted)" }}
          >
            Substituting:{" "}
            <span style={{ color: "var(--text)" }}>{movementName}</span>
          </span>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close conversion panel"
          className="font-data text-[16px] leading-none transition-colors hover:opacity-70"
          style={{ color: "var(--muted)" }}
        >
          ×
        </button>
      </div>

      {/* Tab pills */}
      <div className="flex gap-1.5 mb-3">
        {(["distance", "calories"] as Tab[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              aria-pressed={isActive}
              className="rounded-full px-3 py-1 font-sans text-[11px] font-medium capitalize transition-colors"
              style={
                isActive
                  ? {
                      background: "var(--blue)",
                      color: "#fff",
                      transition: "background 150ms ease, color 150ms ease",
                    }
                  : {
                      background: "transparent",
                      color: "var(--muted)",
                      transition: "background 150ms ease, color 150ms ease",
                    }
              }
            >
              {tab === "distance" ? "Distance" : "Calories"}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: "1px solid var(--border)" }}
      >
        {rows.map((row, i) => {
          const isLast = i === rows.length - 1;
          const isAssault = row.distance === null;
          const value = activeTab === "distance" ? row.distance : row.calories;

          return (
            <div
              key={row.name}
              className="flex items-center justify-between px-3 py-2.5"
              style={
                !isLast
                  ? { borderBottom: "1px solid var(--border)" }
                  : undefined
              }
            >
              {/* Machine name */}
              <span
                className="font-sans text-[12px]"
                style={{ color: "var(--muted)" }}
              >
                {row.name}
              </span>

              {/* Value */}
              {activeTab === "distance" && isAssault ? (
                <div className="flex items-center gap-1.5">
                  <span
                    className="font-mono text-[12px] font-semibold"
                    style={{ color: "var(--muted)" }}
                  >
                    —
                  </span>
                  <span
                    className="font-sans text-[10px]"
                    style={{ color: "var(--muted)" }}
                  >
                    → use Calories tab
                  </span>
                </div>
              ) : (
                <span
                  className="font-mono text-[12px] font-semibold tabular-nums"
                  style={{ color: "var(--text)" }}
                >
                  {value}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Footnote */}
      <p
        className="mt-2 font-sans text-[10px] leading-relaxed"
        style={{ color: "var(--muted)" }}
      >
        Calorie output scales with athlete size and effort.
      </p>
    </div>
  );
}

// --- Chip + expandable panel (self-contained) ---

interface CardioConversionChipProps {
  distanceKey: DistanceKey;
}

export function CardioConversionChip({
  distanceKey,
}: CardioConversionChipProps) {
  const [open, setOpen] = useState(false);

  const label = distanceLabel(distanceKey);

  return (
    <>
      {/* Chip */}
      <button
        onClick={() => setOpen((v) => !v)}
        data-testid="cardio-sub-chip"
        aria-expanded={open}
        aria-label={`Substitute ${label} — show cardio conversion`}
        className="font-sans text-[11px] font-medium transition-opacity hover:opacity-80"
        style={{ color: "var(--blue)" }}
      >
        Sub cardio ↗
      </button>

      {/* Inline expansion */}
      {open && (
        <CardioConversionPanel
          movementName={label}
          distanceKey={distanceKey}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
