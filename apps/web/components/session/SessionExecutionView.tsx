"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { X, List } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { PlannedSessionOut, PlannedItemOut } from "@/lib/api/plans";
import type { PlanDetail } from "@/lib/api/plans";
import { api } from "@/lib/api/client";
import { ExerciseCard } from "./ExerciseCard";
import { RestTimer } from "./RestTimer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LoggedSet {
  itemId: string;
  setIndex: number;
  loadKg: number | null;
  reps: number;
  rpe: number | null;
  loggedAt: string;
}

type Phase = "idle" | "exercising" | "resting" | "swapping" | "complete";

interface ExecutionState {
  phase: Phase;
  exerciseIndex: number;
  setIndex: number;
  restSecondsLeft: number;
  restTotalSeconds: number;
  restPaused: boolean;
  loggedSets: LoggedSet[];
  swappedExercises: Record<string, string>;
  swapItemId: string | null;
  lastLoadMap: Map<string, number>; // itemId → last logged kg
  substituteError: string | null;
}

type Action =
  | { type: "BEGIN" }
  | {
      type: "LOG_SET";
      itemId: string;
      loadKg: number | null;
      reps: number;
      rpe?: number;
      restSeconds: number;
      isLastSet: boolean;
      isLastExercise: boolean;
    }
  | { type: "REST_TICK"; secondsLeft: number }
  | { type: "REST_COMPLETE" }
  | { type: "SKIP_REST" }
  | { type: "TOGGLE_PAUSE" }
  | { type: "SKIP_EXERCISE"; totalItems: number }
  | { type: "OPEN_SWAP"; itemId: string }
  | { type: "CLOSE_SWAP" }
  | {
      type: "CONFIRM_SWAP";
      originalItemId: string;
      substituteMovementId: string;
    }
  | { type: "SET_LOAD_MAP"; map: Map<string, number> }
  | { type: "SET_SUBSTITUTE_ERROR"; message: string | null };

// afterRest: whether rest completes should advance exercise (true) or advance set (false)
// We track this by storing nextExerciseIndex / nextSetIndex after LOG_SET.

function advanceExercise(
  state: ExecutionState,
  totalItems: number,
): ExecutionState {
  const nextExercise = state.exerciseIndex + 1;
  if (nextExercise >= totalItems) {
    return { ...state, phase: "complete" };
  }
  return {
    ...state,
    phase: "exercising",
    exerciseIndex: nextExercise,
    setIndex: 0,
  };
}

function reducer(state: ExecutionState, action: Action): ExecutionState {
  switch (action.type) {
    case "BEGIN":
      return { ...state, phase: "exercising" };

    case "LOG_SET": {
      const now = new Date().toISOString();
      const newSet: LoggedSet = {
        itemId: action.itemId,
        setIndex: state.setIndex,
        loadKg: action.loadKg,
        reps: action.reps,
        rpe: action.rpe ?? null,
        loggedAt: now,
      };
      const updatedSets = [...state.loggedSets, newSet];
      const updatedLoadMap = new Map(state.lastLoadMap);
      if (action.loadKg !== null) {
        updatedLoadMap.set(action.itemId, action.loadKg);
      }

      // Last set of last exercise — done
      if (action.isLastExercise && action.isLastSet) {
        return {
          ...state,
          loggedSets: updatedSets,
          lastLoadMap: updatedLoadMap,
          phase: "complete",
        };
      }

      if (action.isLastSet) {
        // After rest: advance to next exercise (setIndex will reset)
        return {
          ...state,
          loggedSets: updatedSets,
          lastLoadMap: updatedLoadMap,
          phase: "resting",
          restSecondsLeft: action.restSeconds,
          restTotalSeconds: action.restSeconds,
          restPaused: false,
          // Flag: on REST_COMPLETE, move exerciseIndex forward and reset setIndex
          exerciseIndex: state.exerciseIndex + 1,
          setIndex: 0,
        };
      }

      // Not last set — rest then continue same exercise at next set
      return {
        ...state,
        loggedSets: updatedSets,
        lastLoadMap: updatedLoadMap,
        phase: "resting",
        restSecondsLeft: action.restSeconds,
        restTotalSeconds: action.restSeconds,
        restPaused: false,
        setIndex: state.setIndex + 1,
      };
    }

    case "REST_TICK":
      return { ...state, restSecondsLeft: action.secondsLeft };

    case "REST_COMPLETE":
    case "SKIP_REST":
      return { ...state, phase: "exercising", restPaused: false };

    case "TOGGLE_PAUSE":
      return { ...state, restPaused: !state.restPaused };

    case "SKIP_EXERCISE":
      return advanceExercise(state, action.totalItems);

    case "OPEN_SWAP":
      return { ...state, phase: "swapping", swapItemId: action.itemId };

    case "CLOSE_SWAP":
      return { ...state, phase: "exercising", swapItemId: null };

    case "CONFIRM_SWAP":
      return {
        ...state,
        phase: "exercising",
        swapItemId: null,
        swappedExercises: {
          ...state.swappedExercises,
          [action.originalItemId]: action.substituteMovementId,
        },
      };

    case "SET_LOAD_MAP":
      return { ...state, lastLoadMap: action.map };

    case "SET_SUBSTITUTE_ERROR":
      return { ...state, substituteError: action.message };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Rest duration by archetype
// ---------------------------------------------------------------------------

const REST_SECONDS_BY_ARCHETYPE: Record<string, number> = {
  "strength-bias": 180,
  "one-rm-peak": 240,
  "conditioning-bias": 60,
  "gymnastics-skill": 90,
  "skill-acquisition": 90,
  "general-crossfit": 90,
  "travel-minimal": 60,
  "aerobic-base": 60,
  "bodyweight-calisthenics": 60,
};

function getRestSeconds(archetype: string): number {
  return REST_SECONDS_BY_ARCHETYPE[archetype] ?? 90;
}

// ---------------------------------------------------------------------------
// localStorage helpers for load pre-population
// ---------------------------------------------------------------------------

const LS_PREFIX = "fithub:lastload:";

function getLastLoadFromStorage(movementId: string): number | null {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem(`${LS_PREFIX}${movementId}`);
  if (val === null) return null;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? null : parsed;
}

function saveLastLoadToStorage(movementId: string, kg: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${LS_PREFIX}${movementId}`, String(kg));
}

// ---------------------------------------------------------------------------
// Substitute fetch hook
// ---------------------------------------------------------------------------

interface SubstituteOption {
  movementId: string;
  movementName: string;
  movementPattern: string;
  reason: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SessionExecutionViewProps {
  session: PlannedSessionOut;
  plan: Pick<PlanDetail, "id" | "archetype" | "title">;
  accessToken: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SessionExecutionView({
  session,
  plan,
  accessToken,
}: SessionExecutionViewProps) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  const restSeconds = getRestSeconds(plan.archetype);

  const initialState: ExecutionState = {
    phase: "idle",
    exerciseIndex: 0,
    setIndex: 0,
    restSecondsLeft: restSeconds,
    restTotalSeconds: restSeconds,
    restPaused: false,
    loggedSets: [],
    swappedExercises: {},
    swapItemId: null,
    lastLoadMap: new Map(),
    substituteError: null,
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  // Current item
  const currentItem: PlannedItemOut | undefined =
    session.items[state.exerciseIndex];
  const totalSets = currentItem?.sets ?? 1;
  const totalItems = session.items.length;

  // Load pre-population from localStorage on mount
  useEffect(() => {
    const map = new Map<string, number>();
    for (const item of session.items) {
      const stored = getLastLoadFromStorage(item.id);
      if (stored !== null) {
        map.set(item.id, stored);
      } else if (item.load_kg !== null) {
        // fall back to prescribed
        map.set(item.id, item.load_kg);
      }
    }
    dispatch({ type: "SET_LOAD_MAP", map });
  }, [session.items]);

  // Substitute options state
  const [substitutes, setSubstitutes] = useState<SubstituteOption[]>([]);
  const [substitutesLoading, setSubstitutesLoading] = useState(false);

  // Fetch substitutes when swap sheet opens
  useEffect(() => {
    if (state.phase !== "swapping" || !state.swapItemId) return;

    const controller = new AbortController();
    let cancelled = false;
    const swapItemId = state.swapItemId;

    // Defer state resets to a microtask to satisfy react-hooks/set-state-in-effect
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setSubstitutes([]);
      setSubstitutesLoading(true);
      dispatch({ type: "SET_SUBSTITUTE_ERROR", message: null });
    });

    api.movements
      .getSubstitutes(accessToken, swapItemId, [], {
        signal: controller.signal,
      })
      .then((results) => {
        if (cancelled) return;
        setSubstitutes(
          results.map((r) => ({
            movementId: r.id,
            movementName: r.name,
            movementPattern: r.movement_pattern,
            reason: r.equipment_required.join(", "),
          })),
        );
        setSubstitutesLoading(false);
      })
      .catch(() => {
        if (cancelled || controller.signal.aborted) return;
        dispatch({
          type: "SET_SUBSTITUTE_ERROR",
          message: "Could not load substitutes. Try again.",
        });
        setSubstitutesLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [state.phase, state.swapItemId, accessToken]);

  // Handlers
  const handleBegin = useCallback(() => {
    dispatch({ type: "BEGIN" });
  }, []);

  const handleLogSet = useCallback(
    (kg: number | null, reps: number, rpe?: number) => {
      if (!currentItem) return;
      // Save to localStorage for next session pre-population
      if (kg !== null) {
        saveLastLoadToStorage(currentItem.id, kg);
      }

      const isLastSet = state.setIndex >= totalSets - 1;
      const isLastExercise = state.exerciseIndex >= totalItems - 1;

      dispatch({
        type: "LOG_SET",
        itemId: currentItem.id,
        loadKg: kg,
        reps,
        rpe,
        restSeconds,
        isLastSet,
        isLastExercise,
      });
    },
    [
      currentItem,
      state.setIndex,
      state.exerciseIndex,
      totalSets,
      totalItems,
      restSeconds,
    ],
  );

  const handleRestTick = useCallback((secondsLeft: number) => {
    dispatch({ type: "REST_TICK", secondsLeft });
  }, []);

  const handleRestComplete = useCallback(() => {
    dispatch({ type: "REST_COMPLETE" });
  }, []);

  const handleSkipRest = useCallback(() => {
    dispatch({ type: "SKIP_REST" });
  }, []);

  const handleTogglePause = useCallback(() => {
    dispatch({ type: "TOGGLE_PAUSE" });
  }, []);

  const handleSkipExercise = useCallback(() => {
    dispatch({ type: "SKIP_EXERCISE", totalItems });
  }, [totalItems]);

  const handleOpenSwap = useCallback(() => {
    if (!currentItem) return;
    dispatch({ type: "OPEN_SWAP", itemId: currentItem.id });
  }, [currentItem]);

  const handleCloseSwap = useCallback(() => {
    dispatch({ type: "CLOSE_SWAP" });
  }, []);

  const handleConfirmSwap = useCallback(
    (substituteMovementId: string) => {
      if (!currentItem) return;
      dispatch({
        type: "CONFIRM_SWAP",
        originalItemId: currentItem.id,
        substituteMovementId,
      });
    },
    [currentItem],
  );

  const handleFinish = useCallback(() => {
    router.push(`/plans/${plan.id}`);
  }, [router, plan.id]);

  // Progress bar (exercises completed / total)
  const progressPct =
    totalItems > 0 ? (state.exerciseIndex / totalItems) * 100 : 0;

  // Session overview open state
  const [overviewOpen, setOverviewOpen] = useState(false);

  // Transition config matching MobileMoreSheet pattern
  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: "easeOut" as const };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg)]">
      {/* Session header */}
      <header className="flex items-center justify-between px-5 pt-5 pb-3 gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="font-data text-[11px] text-[var(--accent)] truncate">
            $ session --execute
          </p>
          <h1 className="font-heading text-[20px] text-[var(--text)] leading-tight truncate">
            {session.title}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Overview button */}
          <button
            onClick={() => setOverviewOpen(true)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:text-[var(--text)]"
            aria-label="View session overview: $ session --list"
          >
            <List className="h-4 w-4" strokeWidth={2} />
          </button>
          {/* Exit button */}
          <button
            onClick={() => router.push(`/plans/${plan.id}`)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:text-[var(--red)]"
            aria-label="Exit session"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="px-5 pb-3">
        <div
          className="h-2 w-full rounded-full overflow-hidden"
          style={{ background: "var(--border)" }}
          role="progressbar"
          aria-valuenow={Math.round(progressPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Session progress"
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              background: "var(--accent)",
              transition: prefersReducedMotion ? "none" : undefined,
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="font-data tabular-nums text-[11px] text-[var(--muted)]">
            {state.exerciseIndex}/{totalItems} exercises
          </span>
          <span className="font-data tabular-nums text-[11px] text-[var(--muted)]">
            {Math.round(progressPct)}%
          </span>
        </div>
      </div>

      {/* Main content area */}
      <main className="flex-1 px-5 pb-8 flex flex-col gap-4">
        <AnimatePresence mode="wait">
          {/* IDLE */}
          {state.phase === "idle" && (
            <motion.div
              key="idle"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? {} : { opacity: 0, y: -8 }}
              transition={transition}
              className="flex flex-col items-center justify-center flex-1 gap-8 py-12"
            >
              <div className="text-center flex flex-col gap-3">
                <p className="font-data text-[11px] text-[var(--accent)]">
                  $ git checkout session/{session.id.slice(0, 7)}
                </p>
                <h2 className="font-heading text-[32px] text-[var(--text)]">
                  {session.title}
                </h2>
                <p className="font-sans text-[14px] text-[var(--muted)]">
                  <span className="font-data tabular-nums text-[var(--text)]">
                    {totalItems}
                  </span>{" "}
                  exercise{totalItems !== 1 ? "s" : ""} ·{" "}
                  <span className="font-data tabular-nums text-[var(--text)]">
                    {session.items.reduce(
                      (acc, item) => acc + (item.sets ?? 1),
                      0,
                    )}
                  </span>{" "}
                  total sets
                </p>
              </div>

              <button
                onClick={handleBegin}
                className="min-h-[56px] w-full max-w-[320px] rounded-2xl bg-[var(--accent)] font-sans text-[16px] font-semibold text-[var(--bg)] transition-opacity hover:opacity-90"
              >
                begin session
              </button>

              {/* Preview list */}
              <div className="w-full max-w-[320px] flex flex-col gap-2">
                {session.items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                  >
                    <span className="font-data tabular-nums text-[13px] text-[var(--muted)] w-5 text-right shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-sans text-[13px] text-[var(--text)] flex-1 truncate">
                      {item.movement_name}
                    </span>
                    <span className="font-data tabular-nums text-[12px] text-[var(--muted)] shrink-0">
                      {item.sets ?? 1}×{item.reps ?? "?"}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* EXERCISING */}
          {state.phase === "exercising" && currentItem && (
            <motion.div
              key={`exercising-${state.exerciseIndex}-${state.setIndex}`}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? {} : { opacity: 0, y: -8 }}
              transition={transition}
            >
              <ExerciseCard
                item={currentItem}
                exerciseIndex={state.exerciseIndex}
                totalExercises={totalItems}
                setIndex={state.setIndex}
                lastLoggedKg={state.lastLoadMap.get(currentItem.id) ?? null}
                onLogSet={handleLogSet}
                onSwap={handleOpenSwap}
                onSkip={handleSkipExercise}
              />
            </motion.div>
          )}

          {/* RESTING */}
          {state.phase === "resting" && (
            <motion.div
              key="resting"
              initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.97 }}
              transition={transition}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)]"
            >
              <RestTimer
                secondsLeft={state.restSecondsLeft}
                totalSeconds={state.restTotalSeconds}
                paused={state.restPaused}
                onTick={handleRestTick}
                onComplete={handleRestComplete}
                onSkip={handleSkipRest}
                onTogglePause={handleTogglePause}
              />
            </motion.div>
          )}

          {/* COMPLETE */}
          {state.phase === "complete" && (
            <motion.div
              key="complete"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={transition}
              className="flex flex-col items-center justify-center flex-1 gap-8 py-12"
            >
              <div className="text-center flex flex-col gap-3">
                <p className="font-data text-[11px] text-[var(--green)]">
                  $ git commit -m &quot;session complete&quot;
                </p>
                <h2 className="font-heading text-[36px] text-[var(--text)]">
                  Session committed
                </h2>
                <p className="font-sans text-[14px] text-[var(--muted)]">
                  <span className="font-data tabular-nums text-[var(--green)]">
                    {state.loggedSets.length}
                  </span>{" "}
                  sets logged
                </p>
              </div>

              {/* Set summary */}
              <div className="w-full flex flex-col gap-2">
                {session.items.map((item) => {
                  const itemSets = state.loggedSets.filter(
                    (s) => s.itemId === item.id,
                  );
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-2"
                      style={{
                        background:
                          itemSets.length > 0
                            ? "color-mix(in srgb, var(--green) 15%, transparent)"
                            : "var(--surface)",
                        borderColor:
                          itemSets.length > 0
                            ? "var(--green)"
                            : "var(--border)",
                      }}
                    >
                      <span
                        className="text-[16px]"
                        style={{
                          color:
                            itemSets.length > 0
                              ? "var(--green)"
                              : "var(--muted)",
                        }}
                      >
                        {itemSets.length > 0 ? "✓" : "○"}
                      </span>
                      <span className="font-sans text-[13px] text-[var(--text)] flex-1 truncate">
                        {item.movement_name}
                      </span>
                      <span className="font-data tabular-nums text-[12px] text-[var(--muted)]">
                        {itemSets.length}/{item.sets ?? 1}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleFinish}
                className="min-h-[56px] w-full rounded-2xl bg-[var(--accent)] font-sans text-[16px] font-semibold text-[var(--bg)] transition-opacity hover:opacity-90"
              >
                push to plan →
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Session overview sheet */}
      <Sheet open={overviewOpen} onOpenChange={setOverviewOpen}>
        <SheetContent
          side="bottom"
          className="bg-[var(--surface)] border-t border-[var(--border)] rounded-t-2xl max-h-[70vh] overflow-y-auto pb-8"
        >
          <SheetHeader className="px-5 pt-4 pb-2">
            <p className="font-data text-[11px] text-[var(--accent)] text-left">
              $ session --list
            </p>
            <SheetTitle className="font-heading text-[20px] text-[var(--text)] text-left">
              {session.title}
            </SheetTitle>
          </SheetHeader>

          {/* Overall progress bar */}
          <div className="px-5 pb-3">
            <div
              className="h-2 w-full rounded-full overflow-hidden"
              style={{ background: "var(--border)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progressPct}%`,
                  background: "var(--accent)",
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 px-5 pb-6">
            {session.items.map((item, idx) => {
              const itemSets = state.loggedSets.filter(
                (s) => s.itemId === item.id,
              );
              const isCurrent =
                idx === state.exerciseIndex && state.phase === "exercising";
              const isDone = itemSets.length >= (item.sets ?? 1);

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border px-3 py-3"
                  style={{
                    borderColor: isCurrent
                      ? "var(--accent)"
                      : isDone
                        ? "var(--green)"
                        : "var(--border)",
                    background: isDone
                      ? "color-mix(in srgb, var(--green) 15%, transparent)"
                      : isCurrent
                        ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                        : "var(--surface)",
                  }}
                >
                  <span
                    className="font-data tabular-nums text-[13px] w-5 text-right shrink-0"
                    style={{
                      color: isCurrent
                        ? "var(--accent)"
                        : isDone
                          ? "var(--green)"
                          : "var(--muted)",
                    }}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-[13px] text-[var(--text)] truncate">
                      {item.movement_name}
                    </p>
                    <p className="font-data tabular-nums text-[11px] text-[var(--muted)]">
                      {item.sets ?? 1}×{item.reps ?? "?"}{" "}
                      {item.load_kg !== null && (
                        <span style={{ color: "var(--amber)" }}>
                          @ {item.load_kg} kg
                        </span>
                      )}
                    </p>
                  </div>
                  {/* Set pills */}
                  <div className="flex gap-1 shrink-0">
                    {Array.from({ length: item.sets ?? 1 }, (_, si) => (
                      <div
                        key={si}
                        className="h-2 w-4 rounded-sm"
                        style={{
                          background:
                            si < itemSets.length
                              ? "var(--green)"
                              : "var(--border)",
                        }}
                        aria-label={
                          si < itemSets.length
                            ? `Set ${si + 1} complete`
                            : `Set ${si + 1} remaining`
                        }
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Exercise swap sheet */}
      <Sheet
        open={state.phase === "swapping"}
        onOpenChange={(open) => {
          if (!open) handleCloseSwap();
        }}
      >
        <SheetContent
          side="bottom"
          className="bg-[var(--surface)] border-t border-[var(--border)] rounded-t-2xl max-h-[60vh] overflow-y-auto pb-8"
        >
          <SheetHeader className="px-5 pt-4 pb-2">
            <p className="font-data text-[11px] text-[var(--accent)] text-left">
              $ checkout --swap
            </p>
            <SheetTitle className="font-heading text-[20px] text-[var(--text)] text-left">
              swap exercise
            </SheetTitle>
          </SheetHeader>

          <div className="px-5 pb-6 flex flex-col gap-3">
            {substitutesLoading && (
              <p className="font-sans text-[13px] text-[var(--muted)] py-4 text-center">
                loading substitutes...
              </p>
            )}
            {state.substituteError && (
              <p
                className="font-sans text-[12px] text-[var(--red)]"
                role="alert"
              >
                {state.substituteError}
              </p>
            )}
            {!substitutesLoading &&
              substitutes.length === 0 &&
              !state.substituteError && (
                <p className="font-sans text-[13px] text-[var(--muted)] py-4 text-center">
                  no substitutes available
                </p>
              )}
            {substitutes.map((sub) => (
              <div
                key={sub.movementId}
                className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-[14px] text-[var(--text)] font-semibold">
                    {sub.movementName}
                  </p>
                  {sub.movementPattern && (
                    <p className="font-data text-[11px] text-[var(--accent)] mt-0.5">
                      {sub.movementPattern}
                    </p>
                  )}
                  {sub.reason && (
                    <p className="font-sans text-[11px] text-[var(--muted)] mt-0.5">
                      {sub.reason}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleConfirmSwap(sub.movementId)}
                  className="min-h-[44px] px-3 rounded-lg bg-[var(--accent)] font-sans text-[12px] font-bold text-[var(--bg)] transition-opacity hover:opacity-90 shrink-0"
                  aria-label={`Use ${sub.movementName} as substitute`}
                >
                  use this
                </button>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
