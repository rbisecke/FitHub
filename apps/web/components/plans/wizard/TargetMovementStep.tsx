"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { api } from "@/lib/api/client";
import type { WizardState, PrerequisiteStatus } from "@/lib/types/plans";
import type { Movement } from "@/lib/api";
import type { SkillContextOut } from "@/lib/api/plans";
import { Skeleton } from "@/components/ui/skeleton";
import { PrerequisiteLadder } from "./PrerequisiteLadder";

/**
 * Maps the real, history-aware skill-context response (design spec §10) to
 * ladder rungs. `prerequisite_chain` runs entry-level -> target (last
 * element); `confirmed_prerequisites` are rungs the athlete has actually
 * logged in the last 90 days; `current_entry_point` is "you are here" — it
 * can equal the target movement itself once every prerequisite is
 * confirmed, so `isCurrent` is tracked independently of `status` rather
 * than as a 4th status value.
 */
function mapSkillContextToLadder(ctx: SkillContextOut): PrerequisiteStatus[] {
  const chain = ctx.prerequisite_chain;
  const lastIndex = chain.length - 1;
  const items = chain.map((name, i) => {
    const isTarget = i === lastIndex;
    const isConfirmed = ctx.confirmed_prerequisites.includes(name);
    return {
      movementId: `${name}-${i}`,
      movementName: name,
      status: isTarget ? "target" : isConfirmed ? "checked" : "pending",
      isCurrent: name === ctx.current_entry_point,
    } satisfies PrerequisiteStatus;
  });
  // `prerequisite_chain` runs entry-level -> target; the ladder renders
  // top-to-bottom, and the design (§10) wants the target skill at the top
  // with entry-level prerequisites at the bottom, so reverse for display.
  return items.reverse();
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
  on1rmChange: (kg: number | null, source?: "history" | "none" | null) => void;
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

  // Real, history-aware skill-prerequisite chain (design spec §10) — replaces
  // the previous static/fake client-side ladder entirely.
  const [skillContext, setSkillContext] = useState<SkillContextOut | null>(
    null,
  );
  const [skillContextLoading, setSkillContextLoading] = useState(false);
  const [skillContextError, setSkillContextError] = useState(false);
  const [skillContextRetryKey, setSkillContextRetryKey] = useState(0);

  useEffect(() => {
    if (archetype !== "skill-acquisition" || !selectedMovementId) {
      setSkillContext(null);
      setSkillContextError(false);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    setSkillContextLoading(true);
    setSkillContextError(false);
    api.movements
      .skillContext(accessToken, selectedMovementId, {
        signal: controller.signal,
      })
      .then((data) => {
        if (!cancelled) setSkillContext(data);
      })
      .catch(() => {
        if (!cancelled && !controller.signal.aborted)
          setSkillContextError(true);
      })
      .finally(() => {
        if (!cancelled) setSkillContextLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [archetype, selectedMovementId, accessToken, skillContextRetryKey]);

  const ladderItems = useMemo<PrerequisiteStatus[] | null>(() => {
    if (!skillContext || !skillContext.available) return null;
    return mapSkillContextToLadder(skillContext);
  }, [skillContext]);

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

  // 1RM back-fill (one-rm-peak only, 02 §2.4) — on selecting a target
  // movement, look up the athlete's own history and pre-fill Current 1RM
  // from the Epley-derived best e1RM (the same figure the Records domain
  // shows as `current_e1rm_kg`/`best_1rm_kg`). Only runs once per selection
  // (guarded by current1rmSource being unset). manuallyEditedRef is a second,
  // synchronous guard: the effect's own dependency-based guard only stops a
  // *new* fetch from starting, it does nothing about a fetch already in
  // flight — without this ref, typing a real 1RM while the lookup is still
  // pending gets silently overwritten the moment the (now-stale) response
  // resolves.
  const manuallyEditedRef = useRef(false);
  useEffect(() => {
    manuallyEditedRef.current = false;
  }, [selectedMovementId]);

  useEffect(() => {
    if (archetype !== "one-rm-peak" || !selectedMovementId) return;
    if (state.current1rmSource !== null) return;

    const controller = new AbortController();
    let cancelled = false;

    api.analytics
      .personalRecords(accessToken, { signal: controller.signal })
      .then((records) => {
        if (cancelled || manuallyEditedRef.current) return;
        const match = records.find(
          (r) =>
            r.movement_id === selectedMovementId ||
            r.movement_name.trim().toLowerCase() ===
              selectedMovementName?.trim().toLowerCase(),
        );
        const backfillKg = match?.current_e1rm_kg ?? match?.best_1rm_kg ?? null;
        on1rmChange(backfillKg, backfillKg !== null ? "history" : "none");
      })
      .catch(() => {
        if (
          !cancelled &&
          !controller.signal.aborted &&
          !manuallyEditedRef.current
        ) {
          on1rmChange(null, "none");
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    archetype,
    selectedMovementId,
    selectedMovementName,
    accessToken,
    state.current1rmSource,
    on1rmChange,
  ]);

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
          className="font-mono text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
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
            onChange={(e) => {
              manuallyEditedRef.current = true;
              on1rmChange(
                e.target.value === "" ? null : Number(e.target.value),
                state.current1rmSource,
              );
            }}
            placeholder={
              state.current1rmSource === null
                ? "looking up history…"
                : "e.g. 100"
            }
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
          {state.current1rmSource === "history" && current1rmKg !== null && (
            <p
              className="mt-1 font-mono text-xs"
              style={{ color: "var(--muted)" }}
            >
              From your best logged e1RM &mdash; edit if incorrect.
            </p>
          )}
          {state.current1rmSource === "none" && (
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
              onClick={() => {
                manuallyEditedRef.current = true;
                on1rmChange(null, "none");
              }}
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

      {/* Prerequisite ladder — skill-acquisition only, real backend data (§10) */}
      {archetype === "skill-acquisition" && selectedMovementId && (
        <div>
          <p
            className="mb-2 font-mono text-xs"
            style={{ color: "var(--muted)" }}
          >
            {skillContext?.available && skillContext.target_skill
              ? `Your path to ${skillContext.target_skill}`
              : "prerequisite ladder"}
          </p>

          {skillContextLoading && (
            <div
              className="flex flex-col gap-2"
              aria-label="Loading prerequisite ladder"
            >
              <Skeleton className="h-5 w-3/4 rounded-sm" />
              <Skeleton className="h-5 w-2/3 rounded-sm" />
              <Skeleton className="h-5 w-1/2 rounded-sm" />
            </div>
          )}

          {!skillContextLoading && skillContextError && (
            <div className="flex flex-col items-start gap-2">
              <p
                className="font-mono text-xs"
                style={{ color: "var(--red)" }}
                role="alert"
              >
                Couldn&apos;t load your skill path — retry
              </p>
              <button
                type="button"
                onClick={() => setSkillContextRetryKey((k) => k + 1)}
                className="rounded font-mono text-xs transition-colors"
                style={{
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  padding: "4px 10px",
                  minHeight: "44px",
                  cursor: "pointer",
                }}
              >
                retry
              </button>
            </div>
          )}

          {!skillContextLoading &&
            !skillContextError &&
            skillContext &&
            !skillContext.available && (
              <p
                className="font-mono text-xs"
                style={{ color: "var(--muted)" }}
              >
                No prerequisite ladder for this skill
              </p>
            )}

          {!skillContextLoading && !skillContextError && ladderItems && (
            <PrerequisiteLadder items={ladderItems} />
          )}
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
