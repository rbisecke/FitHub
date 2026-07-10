import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Inline the reducer logic for isolated testing
// ---------------------------------------------------------------------------

type Phase = "idle" | "exercising" | "resting" | "swapping" | "complete";

interface LoggedSet {
  itemId: string;
  setIndex: number;
  loadKg: number | null;
  reps: number;
  rpe: number | null;
  loggedAt: string;
}

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
  lastLoadMap: Map<string, number>;
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

      if (action.isLastExercise && action.isLastSet) {
        return {
          ...state,
          loggedSets: updatedSets,
          lastLoadMap: updatedLoadMap,
          phase: "complete",
        };
      }

      if (action.isLastSet) {
        return {
          ...state,
          loggedSets: updatedSets,
          lastLoadMap: updatedLoadMap,
          phase: "resting",
          restSecondsLeft: action.restSeconds,
          restTotalSeconds: action.restSeconds,
          restPaused: false,
          exerciseIndex: state.exerciseIndex + 1,
          setIndex: 0,
        };
      }

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
// Tests
// ---------------------------------------------------------------------------

function makeInitialState(overrides?: Partial<ExecutionState>): ExecutionState {
  return {
    phase: "idle",
    exerciseIndex: 0,
    setIndex: 0,
    restSecondsLeft: 90,
    restTotalSeconds: 90,
    restPaused: false,
    loggedSets: [],
    swappedExercises: {},
    swapItemId: null,
    lastLoadMap: new Map(),
    substituteError: null,
    ...overrides,
  };
}

describe("Session execution state machine", () => {
  describe("BEGIN", () => {
    it("transitions idle → exercising", () => {
      const state = makeInitialState({ phase: "idle" });
      const next = reducer(state, { type: "BEGIN" });
      expect(next.phase).toBe("exercising");
    });
  });

  describe("LOG_SET", () => {
    it("transitions to resting after a non-last set", () => {
      const state = makeInitialState({ phase: "exercising", setIndex: 0 });
      const next = reducer(state, {
        type: "LOG_SET",
        itemId: "item-1",
        loadKg: 100,
        reps: 5,
        restSeconds: 90,
        isLastSet: false,
        isLastExercise: false,
      });
      expect(next.phase).toBe("resting");
      expect(next.setIndex).toBe(1);
      expect(next.exerciseIndex).toBe(0);
      expect(next.restSecondsLeft).toBe(90);
    });

    it("increments exerciseIndex and resets setIndex after logging last set of non-last exercise", () => {
      const state = makeInitialState({
        phase: "exercising",
        exerciseIndex: 0,
        setIndex: 2,
      });
      const next = reducer(state, {
        type: "LOG_SET",
        itemId: "item-1",
        loadKg: 80,
        reps: 3,
        restSeconds: 180,
        isLastSet: true,
        isLastExercise: false,
      });
      expect(next.phase).toBe("resting");
      expect(next.exerciseIndex).toBe(1);
      expect(next.setIndex).toBe(0);
    });

    it("transitions to complete when last set of last exercise is logged", () => {
      const state = makeInitialState({
        phase: "exercising",
        exerciseIndex: 2,
        setIndex: 2,
      });
      const next = reducer(state, {
        type: "LOG_SET",
        itemId: "item-3",
        loadKg: 60,
        reps: 8,
        restSeconds: 90,
        isLastSet: true,
        isLastExercise: true,
      });
      expect(next.phase).toBe("complete");
    });

    it("stores logged set in loggedSets", () => {
      const state = makeInitialState({ phase: "exercising" });
      const next = reducer(state, {
        type: "LOG_SET",
        itemId: "item-1",
        loadKg: 75,
        reps: 5,
        restSeconds: 90,
        isLastSet: false,
        isLastExercise: false,
      });
      expect(next.loggedSets).toHaveLength(1);
      const firstSet = next.loggedSets[0];
      expect(firstSet).toBeDefined();
      expect(firstSet?.itemId).toBe("item-1");
      expect(firstSet?.loadKg).toBe(75);
      expect(firstSet?.reps).toBe(5);
    });

    it("updates lastLoadMap when loadKg is provided", () => {
      const state = makeInitialState({ phase: "exercising" });
      const next = reducer(state, {
        type: "LOG_SET",
        itemId: "item-abc",
        loadKg: 120,
        reps: 1,
        restSeconds: 240,
        isLastSet: false,
        isLastExercise: false,
      });
      expect(next.lastLoadMap.get("item-abc")).toBe(120);
    });

    it("does not update lastLoadMap when loadKg is null (bodyweight)", () => {
      const state = makeInitialState({ phase: "exercising" });
      const next = reducer(state, {
        type: "LOG_SET",
        itemId: "item-bw",
        loadKg: null,
        reps: 10,
        restSeconds: 60,
        isLastSet: false,
        isLastExercise: false,
      });
      expect(next.lastLoadMap.has("item-bw")).toBe(false);
    });
  });

  describe("REST_TICK", () => {
    it("decrements restSecondsLeft", () => {
      const state = makeInitialState({ phase: "resting", restSecondsLeft: 45 });
      const next = reducer(state, { type: "REST_TICK", secondsLeft: 44 });
      expect(next.restSecondsLeft).toBe(44);
      expect(next.phase).toBe("resting");
    });
  });

  describe("REST_COMPLETE / SKIP_REST", () => {
    it("REST_COMPLETE transitions resting → exercising", () => {
      const state = makeInitialState({ phase: "resting" });
      const next = reducer(state, { type: "REST_COMPLETE" });
      expect(next.phase).toBe("exercising");
      expect(next.restPaused).toBe(false);
    });

    it("SKIP_REST transitions resting → exercising", () => {
      const state = makeInitialState({ phase: "resting" });
      const next = reducer(state, { type: "SKIP_REST" });
      expect(next.phase).toBe("exercising");
    });
  });

  describe("TOGGLE_PAUSE", () => {
    it("toggles restPaused false → true", () => {
      const state = makeInitialState({ phase: "resting", restPaused: false });
      const next = reducer(state, { type: "TOGGLE_PAUSE" });
      expect(next.restPaused).toBe(true);
    });

    it("toggles restPaused true → false", () => {
      const state = makeInitialState({ phase: "resting", restPaused: true });
      const next = reducer(state, { type: "TOGGLE_PAUSE" });
      expect(next.restPaused).toBe(false);
    });
  });

  describe("SKIP_EXERCISE", () => {
    it("advances to next exercise when not last", () => {
      const state = makeInitialState({ phase: "exercising", exerciseIndex: 1 });
      const next = reducer(state, { type: "SKIP_EXERCISE", totalItems: 5 });
      expect(next.exerciseIndex).toBe(2);
      expect(next.setIndex).toBe(0);
      expect(next.phase).toBe("exercising");
    });

    it("transitions to complete when skipping last exercise", () => {
      const state = makeInitialState({ phase: "exercising", exerciseIndex: 4 });
      const next = reducer(state, { type: "SKIP_EXERCISE", totalItems: 5 });
      expect(next.phase).toBe("complete");
    });
  });

  describe("OPEN_SWAP / CLOSE_SWAP / CONFIRM_SWAP", () => {
    it("opens swap sheet", () => {
      const state = makeInitialState({ phase: "exercising" });
      const next = reducer(state, { type: "OPEN_SWAP", itemId: "item-x" });
      expect(next.phase).toBe("swapping");
      expect(next.swapItemId).toBe("item-x");
    });

    it("closes swap sheet and returns to exercising", () => {
      const state = makeInitialState({
        phase: "swapping",
        swapItemId: "item-x",
      });
      const next = reducer(state, { type: "CLOSE_SWAP" });
      expect(next.phase).toBe("exercising");
      expect(next.swapItemId).toBeNull();
    });

    it("confirms swap and records swapped exercise", () => {
      const state = makeInitialState({
        phase: "swapping",
        swapItemId: "orig-item",
      });
      const next = reducer(state, {
        type: "CONFIRM_SWAP",
        originalItemId: "orig-item",
        substituteMovementId: "sub-movement",
      });
      expect(next.phase).toBe("exercising");
      expect(next.swappedExercises["orig-item"]).toBe("sub-movement");
    });
  });

  describe("Full flow: 2 exercises, 2 sets each", () => {
    it("completes all sets in correct order", () => {
      let s = makeInitialState({ phase: "idle" });

      // Begin
      s = reducer(s, { type: "BEGIN" });
      expect(s.phase).toBe("exercising");
      expect(s.exerciseIndex).toBe(0);
      expect(s.setIndex).toBe(0);

      // Log set 1 of exercise 1
      s = reducer(s, {
        type: "LOG_SET",
        itemId: "ex1",
        loadKg: 100,
        reps: 5,
        restSeconds: 90,
        isLastSet: false,
        isLastExercise: false,
      });
      expect(s.phase).toBe("resting");
      expect(s.setIndex).toBe(1);

      // Skip rest
      s = reducer(s, { type: "SKIP_REST" });
      expect(s.phase).toBe("exercising");

      // Log set 2 of exercise 1 (last set, not last exercise)
      s = reducer(s, {
        type: "LOG_SET",
        itemId: "ex1",
        loadKg: 100,
        reps: 5,
        restSeconds: 90,
        isLastSet: true,
        isLastExercise: false,
      });
      expect(s.phase).toBe("resting");
      expect(s.exerciseIndex).toBe(1);
      expect(s.setIndex).toBe(0);

      // Rest completes
      s = reducer(s, { type: "REST_COMPLETE" });
      expect(s.phase).toBe("exercising");
      expect(s.exerciseIndex).toBe(1);
      expect(s.setIndex).toBe(0);

      // Log set 1 of exercise 2
      s = reducer(s, {
        type: "LOG_SET",
        itemId: "ex2",
        loadKg: 60,
        reps: 8,
        restSeconds: 60,
        isLastSet: false,
        isLastExercise: false,
      });
      expect(s.phase).toBe("resting");
      expect(s.setIndex).toBe(1);
      expect(s.exerciseIndex).toBe(1);

      s = reducer(s, { type: "SKIP_REST" });

      // Log final set
      s = reducer(s, {
        type: "LOG_SET",
        itemId: "ex2",
        loadKg: 60,
        reps: 8,
        restSeconds: 60,
        isLastSet: true,
        isLastExercise: true,
      });
      expect(s.phase).toBe("complete");
      expect(s.loggedSets).toHaveLength(4);
    });
  });
});
