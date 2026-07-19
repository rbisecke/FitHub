"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { X, List } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  PlannedSessionOut,
  PlannedItemOut,
  PlanDetail,
  CompleteSessionRequest,
  LoggedSetPayload,
} from "@/lib/api/plans";
import type { Movement } from "@/lib/api";
import { api } from "@/lib/api/client";
import { ExerciseCard } from "./ExerciseCard";
import { RestTimer } from "./RestTimer";
import { ExerciseSwapSheet } from "./ExerciseSwapSheet";

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
  // Fix #2 — captured from whatever swap was active for this item AT the
  // moment this set was logged (or null if none). Never re-derived later
  // through swappedExercises, so a swap taken mid-exercise can't retroactively
  // relabel sets that were actually performed under the original movement.
  movementId: string | null;
}

// Fix #1 — resolves a real `movements.id` for the swap sheet from a search
// result set. `movements.name` is UNIQUE NOT NULL in the DB and the plan
// generator only ever writes `planned_items.movement_name` from real,
// unique catalog names, so an exact (case-insensitive) name match reliably
// identifies the corresponding movements row. Exported so it can be tested
// directly against the same code path the component uses, rather than a
// hand-copied mirror.
//
// Known limitation: build_movement_enum's duplicate-name suffixing (e.g.
// "Name (2)") means a literal-match search could theoretically miss on a
// duplicate-named catalog entry — acceptable, not solved here.
export function findExactMovementMatch(
  movements: Pick<Movement, "id" | "name">[],
  movementName: string,
): Pick<Movement, "id" | "name"> | undefined {
  const target = movementName.trim().toLowerCase();
  return movements.find((m) => m.name.trim().toLowerCase() === target);
}

type Phase = "idle" | "exercising" | "resting" | "swapping" | "complete";

// A confirmed exercise substitution — both the substitute's id (needed to
// resolve movement_id in the completion payload, C4) and its name (needed to
// resolve what's rendered/logged for the rest of the exercise, C3).
interface SwapEntry {
  movementId: string;
  movementName: string;
}

interface ExecutionState {
  phase: Phase;
  exerciseIndex: number;
  setIndex: number;
  restSecondsLeft: number;
  restTotalSeconds: number;
  restPaused: boolean;
  loggedSets: LoggedSet[];
  swappedExercises: Record<string, SwapEntry>;
  swapItemId: string | null;
  // Fix #1 — the real `movements.id` resolved for the item currently being
  // swapped, passed to ExerciseSwapSheet's `movementId` prop. Distinct from
  // swapItemId (a planned_items row id), which stays the "which exercise is
  // being swapped" key.
  swapMovementId: string | null;
  lastLoadMap: Map<string, number>; // itemId → last logged kg
  substituteError: string | null;
}

type Action =
  | { type: "BEGIN" }
  | {
      type: "LOG_SET";
      itemId: string;
      movementId: string | null;
      loadKg: number | null;
      reps: number;
      rpe?: number;
      restSeconds: number;
      isLastSet: boolean;
      isLastExercise: boolean;
      totalItems: number;
    }
  | { type: "REST_TICK"; secondsLeft: number }
  | { type: "REST_COMPLETE" }
  | { type: "SKIP_REST" }
  | { type: "TOGGLE_PAUSE" }
  | { type: "SKIP_EXERCISE"; totalItems: number }
  | { type: "OPEN_SWAP"; itemId: string; movementId: string }
  | { type: "CLOSE_SWAP" }
  | {
      type: "CONFIRM_SWAP";
      originalItemId: string;
      substituteMovementId: string;
      substituteMovementName: string;
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
    // S1 — terminal transition: exerciseIndex must reach totalItems so the
    // completion screen's progress header reads the exact total, not one short.
    return { ...state, exerciseIndex: totalItems, phase: "complete" };
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
        movementId: action.movementId,
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
          // S1 — terminal transition: reach totalItems, same fix as advanceExercise's
          // terminal branch, so the completion screen doesn't undercount by one.
          exerciseIndex: action.totalItems,
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
      return {
        ...state,
        phase: "swapping",
        swapItemId: action.itemId,
        swapMovementId: action.movementId,
        substituteError: null,
      };

    case "CLOSE_SWAP":
      return {
        ...state,
        phase: "exercising",
        swapItemId: null,
        swapMovementId: null,
      };

    case "CONFIRM_SWAP":
      return {
        ...state,
        phase: "exercising",
        swapItemId: null,
        swappedExercises: {
          ...state.swappedExercises,
          [action.originalItemId]: {
            movementId: action.substituteMovementId,
            movementName: action.substituteMovementName,
          },
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

// Rest duration is per-archetype, not per-exercise (functional §9.1 note
// #7) — the seven real archetype slugs only; unlisted values fall back to
// the 90s default below.
const REST_SECONDS_BY_ARCHETYPE: Record<string, number> = {
  "strength-bias": 180,
  "one-rm-peak": 240,
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

// S2 — keyed by normalized movement name, not planned_items.id. Each week's
// plan generates fresh planned_items rows with new ids, so an id-keyed cache
// never matches across weeks; the movement name is the only value stable
// enough to recur. Minimal fix — the ideal fix is a stable movement_id on
// PlannedItemOut, which is a backend contract change out of scope here.
// Note: movements.name is case-sensitive-unique at the DB level, so two
// catalog entries differing only in case could theoretically collide on
// this cache key once lower-cased below — acceptable tradeoff for a
// "pre-populate last weight" convenience cache, not authoritative data.
function normalizeMovementKey(movementName: string): string {
  return movementName.trim().toLowerCase().replace(/\s+/g, " ");
}

function getLastLoadFromStorage(movementKey: string): number | null {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem(`${LS_PREFIX}${movementKey}`);
  if (val === null) return null;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? null : parsed;
}

function saveLastLoadToStorage(movementKey: string, kg: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${LS_PREFIX}${movementKey}`, String(kg));
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
    swapMovementId: null,
    lastLoadMap: new Map(),
    substituteError: null,
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  // Current item — C3: resolve through swappedExercises so a confirmed swap
  // changes what's actually shown and logged for the rest of that exercise,
  // not just what's recorded in state. baseItem.id is preserved as the
  // logged/displayed item's id (it's the planned_items row id the backend
  // validates logged_sets against); only movement_name changes for display,
  // with the substitute's movement id resolved separately at payload-build
  // time in handleFinish (see toLoggedSetPayload below).
  const baseItem: PlannedItemOut | undefined =
    session.items[state.exerciseIndex];
  const activeSwap = baseItem ? state.swappedExercises[baseItem.id] : undefined;
  // Memoized so identity is stable across renders when neither baseItem nor
  // activeSwap changed — otherwise every render would produce a fresh object
  // and defeat the useCallback memoization of the handlers below.
  const currentItem: PlannedItemOut | undefined = useMemo(
    () =>
      baseItem && activeSwap
        ? { ...baseItem, movement_name: activeSwap.movementName }
        : baseItem,
    [baseItem, activeSwap],
  );
  const totalSets = currentItem?.sets ?? 1;
  const totalItems = session.items.length;

  // Load pre-population from localStorage on mount
  useEffect(() => {
    const map = new Map<string, number>();
    for (const item of session.items) {
      const stored = getLastLoadFromStorage(
        normalizeMovementKey(item.movement_name),
      );
      if (stored !== null) {
        map.set(item.id, stored);
      } else if (item.load_kg !== null) {
        // fall back to prescribed
        map.set(item.id, item.load_kg);
      }
    }
    dispatch({ type: "SET_LOAD_MAP", map });
  }, [session.items]);

  // Handlers
  const handleBegin = useCallback(() => {
    dispatch({ type: "BEGIN" });
  }, []);

  const handleLogSet = useCallback(
    (kg: number | null, reps: number, rpe?: number) => {
      if (!currentItem) return;
      // Save to localStorage for next session pre-population — keyed by the
      // movement actually being logged (post-swap name, per C3), so a swap
      // taken this session still pre-populates correctly next time (S2).
      if (kg !== null) {
        saveLastLoadToStorage(
          normalizeMovementKey(currentItem.movement_name),
          kg,
        );
      }

      const isLastSet = state.setIndex >= totalSets - 1;
      const isLastExercise = state.exerciseIndex >= totalItems - 1;

      dispatch({
        type: "LOG_SET",
        itemId: currentItem.id,
        // Fix #2 — captured now, from whatever swap is active for this item
        // AT THE MOMENT this set is logged. If the user swaps again after
        // this set, that later swap must not retroactively relabel this one.
        movementId: activeSwap?.movementId ?? null,
        loadKg: kg,
        reps,
        rpe,
        restSeconds,
        isLastSet,
        isLastExercise,
        totalItems,
      });
    },
    [
      currentItem,
      activeSwap,
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

  // Fix #1 — resolve a real `movements.id` before opening the swap sheet.
  // currentItem.id is a planned_items row id; the substitutes endpoint
  // (GET /api/v1/movements/{id}/substitutes) looks up public.movements by
  // id, so passing the planned_items id 404s every time. Search the
  // catalog by movement_name and take the exact (case-insensitive) match —
  // see findExactMovementMatch for why this is reliable.
  const [resolvingSwap, setResolvingSwap] = useState(false);

  const handleOpenSwap = useCallback(async () => {
    if (!currentItem) return;
    const itemId = currentItem.id;
    const movementName = currentItem.movement_name;
    setResolvingSwap(true);
    dispatch({ type: "SET_SUBSTITUTE_ERROR", message: null });
    try {
      const results = await api.movements.search(accessToken, {
        q: movementName,
        limit: 20,
      });
      const match = findExactMovementMatch(results, movementName);
      if (!match) {
        dispatch({
          type: "SET_SUBSTITUTE_ERROR",
          message: `Couldn't find "${movementName}" in the movement catalog — swap unavailable.`,
        });
        return;
      }
      dispatch({ type: "OPEN_SWAP", itemId, movementId: match.id });
    } catch {
      dispatch({
        type: "SET_SUBSTITUTE_ERROR",
        message:
          "Couldn't look up substitutes — check your connection and try again.",
      });
    } finally {
      setResolvingSwap(false);
    }
  }, [currentItem, accessToken]);

  const handleCloseSwap = useCallback(() => {
    dispatch({ type: "CLOSE_SWAP" });
  }, []);

  // C3 — both the substitute's id and name are recorded: the name drives what
  // ExerciseCard/SetLogger render for the rest of this exercise, the id
  // resolves movement_id in the completion payload (see toLoggedSetPayload).
  const handleConfirmSwap = useCallback(
    (substituteMovementId: string, substituteMovementName: string) => {
      if (!currentItem) return;
      dispatch({
        type: "CONFIRM_SWAP",
        originalItemId: currentItem.id,
        substituteMovementId,
        substituteMovementName,
      });
    },
    [currentItem],
  );

  // C4 — persist the session before navigating away. S4 — submittingRef is a
  // synchronous guard checked before the first state update, so a rapid
  // double-tap on "push to plan" can't fire two completion requests (the
  // `finishing` state alone would not catch this: it's only committed on the
  // next render, after a second click may have already re-entered).
  const submittingRef = useRef(false);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const handleFinish = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setFinishing(true);
    setFinishError(null);

    // Fix #2 — movement_id is read directly off each already-logged set
    // (captured at LOG_SET time, see the LOG_SET dispatch in handleLogSet),
    // not re-derived through the FINAL swappedExercises state. Re-deriving
    // here would retroactively relabel sets logged before a later swap.
    // planned_item_id always stays the base planned_items row id (what the
    // backend validates against).
    const loggedSetsPayload: LoggedSetPayload[] = state.loggedSets.map((s) => ({
      planned_item_id: s.itemId,
      movement_id: s.movementId,
      load_kg: s.loadKg,
      reps: s.reps,
      rpe: s.rpe,
    }));
    const body: CompleteSessionRequest = {
      logged_sets: loggedSetsPayload,
      bodyweight_kg: null,
    };

    try {
      await api.plans.completeSession(accessToken, plan.id, session.id, body);
      router.push(`/plan/${plan.id}`);
    } catch {
      setFinishError(
        "Couldn't save your session — check your connection and try again.",
      );
      submittingRef.current = false;
      setFinishing(false);
    }
  }, [accessToken, plan.id, session.id, state.loggedSets, router]);

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
            onClick={() => router.push(`/plan/${plan.id}`)}
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
                swapDisabled={resolvingSwap}
              />
              {state.substituteError && (
                <p
                  className="font-sans text-[12px] text-[var(--red)] text-center mt-3"
                  role="alert"
                >
                  {state.substituteError}
                </p>
              )}
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
                disabled={finishing}
                aria-busy={finishing}
                className="min-h-[56px] w-full rounded-2xl bg-[var(--accent)] font-sans text-[16px] font-semibold text-[var(--bg)] transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {finishing ? "pushing…" : "push to plan →"}
              </button>

              {finishError && (
                <p
                  className="font-sans text-[13px] text-[var(--red)] text-center"
                  role="alert"
                >
                  {finishError}
                </p>
              )}
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
              // S5 — the "current" highlight previously disappeared during the
              // resting phase since only "exercising" was checked; extend it so
              // the highlight persists through rest, aligned with S1's fixed
              // exerciseIndex accounting (which is already forward-looking
              // during a rest between exercises).
              const isCurrent =
                idx === state.exerciseIndex &&
                (state.phase === "exercising" || state.phase === "resting");
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
      <ExerciseSwapSheet
        open={state.phase === "swapping"}
        onClose={handleCloseSwap}
        movementId={state.swapMovementId ?? ""}
        movementName={currentItem?.movement_name ?? ""}
        userEquipment={[]}
        accessToken={accessToken}
        onSwap={handleConfirmSwap}
      />
    </div>
  );
}
