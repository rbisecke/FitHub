"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { api } from "@/lib/api/client";
import type { WizardState, PrerequisiteStatus } from "@/lib/types/plans";
import type { Movement } from "@/lib/api";
import { PrerequisiteLadder } from "./PrerequisiteLadder";

// ---------------------------------------------------------------------------
// Static prerequisite chains — keyed by lowercase movement name.
// The last entry in each array is the target movement itself (status: target).
// Earlier entries are prerequisites in ascending difficulty order.
// ---------------------------------------------------------------------------
const SKILL_PREREQS: Record<string, string[]> = {
  "muscle-up": ["Pull-up", "Dip", "Kipping Swing", "Muscle-up"],
  "bar muscle-up": [
    "Pull-up",
    "Chest-to-Bar Pull-up",
    "Kipping Pull-up",
    "Bar Muscle-up",
  ],
  "ring muscle-up": ["Pull-up", "Ring Dip", "Kipping Swing", "Ring Muscle-up"],
  "handstand push-up": [
    "Pike Push-up",
    "Handstand Hold",
    "Kipping HSPU",
    "Handstand Push-up",
  ],
  "handstand walk": ["Handstand Hold", "Handstand Push-up", "Handstand Walk"],
  "pistol squat": [
    "Air Squat",
    "Bulgarian Split Squat",
    "Assisted Pistol Squat",
    "Pistol Squat",
  ],
  "double under": ["Single Under", "Double Under"],
  "toes-to-bar": ["Hanging Knee Raise", "Hanging Leg Raise", "Toes-to-Bar"],
  snatch: ["Overhead Squat", "Hang Power Snatch", "Power Snatch", "Snatch"],
  "clean and jerk": [
    "Front Squat",
    "Hang Power Clean",
    "Power Clean",
    "Clean and Jerk",
  ],
  "ring dip": ["Push-up", "Dip", "Ring Push-up", "Ring Dip"],
  "l-sit": ["Hollow Body Hold", "Tuck L-Sit", "L-Sit"],
};

function getPrerequisites(movementName: string): PrerequisiteStatus[] {
  const key = movementName.toLowerCase();

  // Try an exact match first, then a substring match.
  let chain: string[] | undefined = SKILL_PREREQS[key];
  if (!chain) {
    for (const [k, v] of Object.entries(SKILL_PREREQS)) {
      if (key.includes(k) || k.includes(key)) {
        chain = v;
        break;
      }
    }
  }

  if (!chain) {
    // No chain — just show the movement itself as the target.
    return [{ movementId: "target", movementName, status: "target" }];
  }

  return chain.map((name, i) => ({
    movementId: `prereq-${i}`,
    movementName: name,
    status: i === chain!.length - 1 ? "target" : "pending",
  }));
}

// ---------------------------------------------------------------------------
// Modality filter by archetype
// ---------------------------------------------------------------------------
type ArchetypeFilter = "skill-acquisition" | "one-rm-peak";

function modalityForArchetype(archetype: ArchetypeFilter): string | undefined {
  if (archetype === "skill-acquisition") return "gymnastics";
  if (archetype === "one-rm-peak") return "weightlifting";
  return undefined;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface Props {
  state: WizardState;
  accessToken: string;
  onSelect: (id: string, name: string) => void;
  on1rmChange: (kg: number | null) => void;
  onNext: () => void;
  onBack: () => void;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function TargetMovementStep({
  state,
  accessToken,
  onSelect,
  on1rmChange,
  onNext,
  onBack,
  headingRef,
}: Props) {
  const archetype = state.archetype as ArchetypeFilter;
  const selectedMovementId = state.targetMovementId;
  const selectedMovementName = state.targetMovementName;
  const current1rmKg = state.current1rmKg;

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Movement[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Derived: show results only when query is non-empty and no movement selected.
  const results = query.trim() ? searchResults : [];

  // Prerequisite chain is derived synchronously — no separate state needed.
  const prerequisites = useMemo<PrerequisiteStatus[] | null>(() => {
    if (archetype !== "skill-acquisition" || !selectedMovementName) return null;
    return getPrerequisites(selectedMovementName);
  }, [archetype, selectedMovementName]);

  // Ref so the cleanup function inside the setTimeout closure can abort the
  // right controller even after re-renders.
  const controllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced movement search — new AbortController per keystroke.
  useEffect(() => {
    if (!query.trim()) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (controllerRef.current) controllerRef.current.abort();
      return;
    }

    // Cancel any pending debounce timer and in-flight request.
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (controllerRef.current) controllerRef.current.abort();

    const controller = new AbortController();
    controllerRef.current = controller;
    let cancelled = false;

    debounceRef.current = setTimeout(() => {
      setSearching(true);
      setSearchError(null);

      const modality = modalityForArchetype(archetype);

      api.movements
        .search(
          accessToken,
          { q: query, modality, limit: 10 },
          { signal: controller.signal },
        )
        .then((data) => {
          if (!cancelled) {
            setSearchResults(data);
            setSearching(false);
          }
        })
        .catch(() => {
          if (!cancelled && !controller.signal.aborted) {
            setSearching(false);
            setSearchError("Search failed. Please try again.");
          }
        });
    }, 300);

    return () => {
      cancelled = true;
      controller.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, accessToken, archetype]);

  function handleSelect(id: string, name: string) {
    onSelect(id, name);
    setQuery("");
    setSearchResults([]);
    setSearchError(null);
  }

  function handleClear() {
    onSelect("", "");
    on1rmChange(null);
    setSearchResults([]);
    setQuery("");
  }

  const canContinue = Boolean(selectedMovementId);

  const heading =
    archetype === "one-rm-peak"
      ? "Which lift are you peaking for?"
      : "Which skill are you working toward?";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="font-mono text-sm font-semibold focus:outline-none"
          style={{ color: "var(--text)" }}
        >
          step 4 &mdash; target movement
        </h2>
        <p className="mt-1 font-mono text-xs" style={{ color: "var(--muted)" }}>
          {heading}
        </p>
      </div>

      {/* Search input */}
      <div>
        <label htmlFor="movement-search" className="sr-only">
          Search movements
        </label>
        <input
          id="movement-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search movements..."
          aria-label="Search movements"
          aria-describedby={searchError ? "search-error" : undefined}
          disabled={Boolean(selectedMovementId)}
          className="w-full rounded font-mono text-sm transition-colors focus:outline-none"
          style={{
            border: "1px solid var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--text)",
            padding: "8px 12px",
            opacity: selectedMovementId ? 0.5 : 1,
          }}
        />
        {searching && (
          <p
            className="mt-1 font-mono text-xs"
            style={{ color: "var(--muted)" }}
            aria-live="polite"
          >
            searching...
          </p>
        )}
        {searchError && (
          <p
            id="search-error"
            className="mt-1 font-mono text-xs"
            style={{ color: "var(--red)" }}
            role="alert"
          >
            {searchError}
          </p>
        )}
      </div>

      {/* Results dropdown */}
      {results.length > 0 && !selectedMovementId && (
        <ul
          className="flex flex-col gap-1"
          aria-label="Movement search results"
        >
          {results.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => handleSelect(m.id, m.name)}
                className="w-full rounded text-left font-mono text-sm transition-colors"
                style={{
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--surface)",
                  color: "var(--text)",
                  padding: "8px 12px",
                  minHeight: "44px",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "var(--border)";
                }}
              >
                {m.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Selected movement chip */}
      {selectedMovementId && (
        <div
          className="flex items-center justify-between rounded"
          style={{
            border: "1px solid var(--accent)",
            backgroundColor:
              "color-mix(in srgb, var(--accent) 6%, transparent)",
            padding: "8px 12px",
          }}
        >
          <span className="font-mono text-sm" style={{ color: "var(--text)" }}>
            {selectedMovementName}
          </span>
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear movement selection"
            className="font-mono text-xs transition-colors"
            style={{
              background: "none",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              padding: "4px",
              minHeight: "44px",
            }}
          >
            clear
          </button>
        </div>
      )}

      {/* 1RM field — one-rm-peak only */}
      {archetype === "one-rm-peak" && selectedMovementId && (
        <div>
          <label
            htmlFor="current-1rm"
            className="mb-1 block font-mono text-xs"
            style={{ color: "var(--muted)" }}
          >
            current 1RM (kg) &mdash; edit if incorrect
          </label>
          <input
            id="current-1rm"
            type="number"
            min={0}
            step={2.5}
            value={current1rmKg ?? ""}
            onChange={(e) =>
              on1rmChange(e.target.value === "" ? null : Number(e.target.value))
            }
            placeholder="e.g. 100"
            className="rounded font-data tabular-nums text-[30px] font-bold"
            style={{
              width: "160px",
              border: "1px solid var(--border)",
              backgroundColor: "var(--surface)",
              color: "var(--amber)",
              padding: "8px 12px",
              fontVariantNumeric: "tabular-nums",
            }}
          />
          {current1rmKg === null && (
            <p
              className="mt-1 font-mono text-xs"
              style={{ color: "var(--amber)" }}
            >
              No previous 1RM found &mdash; enter your best attempt.
            </p>
          )}
          {current1rmKg !== null && (
            <button
              type="button"
              onClick={() => on1rmChange(null)}
              className="mt-2 block font-mono text-xs transition-colors"
              style={{
                background: "none",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Continue without 1RM
            </button>
          )}
        </div>
      )}

      {/* Prerequisite ladder — skill-acquisition only */}
      {archetype === "skill-acquisition" && prerequisites && (
        <div>
          <p
            className="mb-2 font-mono text-xs"
            style={{ color: "var(--muted)" }}
          >
            prerequisite ladder
          </p>
          <PrerequisiteLadder items={prerequisites} />
        </div>
      )}

      {/* Navigation */}
      <div className="mt-2 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded font-mono text-sm transition-colors"
          style={{
            border: "1px solid var(--border)",
            background: "none",
            color: "var(--muted)",
            padding: "8px 16px",
            minHeight: "44px",
            cursor: "pointer",
          }}
        >
          back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canContinue}
          data-testid="continue-btn"
          className="rounded font-mono text-sm transition-opacity"
          style={{
            backgroundColor: "var(--text)",
            color: "var(--bg)",
            padding: "8px 16px",
            minHeight: "44px",
            border: "none",
            cursor: canContinue ? "pointer" : "not-allowed",
            opacity: canContinue ? 1 : 0.4,
          }}
        >
          next
        </button>
      </div>
    </div>
  );
}
