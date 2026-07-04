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
      className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {/* Swap icon — 16px for perceptual readability */}
          <svg
            width="16"
            height="16"
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
          <span className="font-sans text-[12px] text-[var(--muted)]">
            Substituting:{" "}
            <span className="text-[var(--text)]">{movementName}</span>
          </span>
        </div>

        {/* Close button — 32×32px touch target */}
        <button
          onClick={onClose}
          aria-label="Close conversion panel"
          className="flex h-8 w-8 items-center justify-center rounded font-mono text-[16px] text-[var(--muted)] transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)]"
        >
          ×
        </button>
      </div>

      {/* Tab pills — tablist pattern for correct a11y semantics */}
      <div
        role="tablist"
        aria-label="Conversion type"
        className="mb-3 flex gap-1.5"
      >
        {(["distance", "calories"] as Tab[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab)}
              className={[
                "rounded-full px-3 py-1 font-sans text-[11px] font-medium capitalize border",
                "transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)]",
                isActive
                  ? // Dark text on --blue passes WCAG AA contrast (#0d1117 on #58a6ff ≈ 7:1)
                    "border-[var(--blue)] bg-[var(--blue)] text-[var(--bg)]"
                  : "border-[var(--border)] bg-transparent text-[var(--muted)] hover:text-[var(--text)]",
              ].join(" ")}
            >
              {tab === "distance" ? "Distance" : "Calories"}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-[var(--border)]">
        {rows.map((row, i) => {
          const isLast = i === rows.length - 1;
          const isAssault = row.distance === null;
          const value = activeTab === "distance" ? row.distance : row.calories;

          return (
            <div
              key={row.name}
              className={[
                "flex items-center justify-between px-3 py-2.5",
                !isLast ? "border-b border-[var(--border)]" : "",
              ].join(" ")}
            >
              {/* Machine name */}
              <span className="font-sans text-[12px] text-[var(--muted)]">
                {row.name}
              </span>

              {/* Value */}
              {activeTab === "distance" && isAssault ? (
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[12px] font-semibold text-[var(--muted)]">
                    —
                  </span>
                  {/* Interactive: click to switch to Calories tab */}
                  <button
                    onClick={() => setActiveTab("calories")}
                    className="font-sans text-[11px] text-[var(--blue)] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--blue)]"
                  >
                    → use Calories tab
                  </button>
                </div>
              ) : (
                <span className="font-mono text-[12px] font-semibold tabular-nums text-[var(--text)]">
                  {value}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Footnote */}
      <p className="mt-2 font-sans text-xs leading-relaxed text-[var(--muted)]">
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
      {/* Chip — pill shape with border for clear affordance */}
      <button
        onClick={() => setOpen((v) => !v)}
        data-testid="cardio-sub-chip"
        aria-expanded={open}
        aria-label={`Substitute ${label} — show cardio conversion`}
        className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-0.5 font-sans text-[11px] font-medium text-[var(--muted)] transition-colors hover:border-[var(--blue)] hover:text-[var(--blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)]"
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
