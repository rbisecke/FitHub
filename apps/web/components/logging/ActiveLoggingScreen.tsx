"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Movement, SavedRoutine } from "@/lib/api";
import { ApiError, createApiClient } from "@/lib/api/client";
import { useRestTimer } from "@/lib/hooks/useRestTimer";
import { SessionSummaryStrip } from "./SessionSummaryStrip";
import { SessionMetadata } from "./SessionMetadata";
import { MovementEntryCard } from "./MovementEntryCard";
import { MovementSearchSheet } from "./MovementSearchSheet";
import { PlateCalculatorSheet } from "./PlateCalculatorSheet";
import { RestTimer } from "./RestTimer";
import { PRCelebrationPill } from "./PRCelebrationPill";
import { SheetOverlay } from "./SheetOverlay";
import { TemplatesStart } from "./TemplatesStart";
import { EntryChooser, type LogEntryMode } from "./EntryChooser";
import { QuickLogSheet } from "./QuickLogSheet";
import { TagMilestoneSheet } from "./TagMilestoneSheet";
import { MyRoutinesSheet } from "./MyRoutinesSheet";
import {
  buildCreateWorkout,
  computeVolumeKg,
  countSets,
  epley1rm,
} from "./logBuild";
import type { DraftEntry, DraftSession, DraftSet } from "./types";
import { emptySet } from "./types";

const MAX_ENTRIES = 10; // functional §2.1 hard cap

function newEntry(movement: Movement): DraftEntry {
  const resultType =
    movement.default_result_type ??
    movement.default_result_types[0] ??
    "weight";
  return {
    id: crypto.randomUUID(),
    movement,
    resultType,
    implement: movement.implement ?? null,
    side: null,
    note: "",
    scaled: false,
    sets: [emptySet()],
    previous: [],
    bestE1rmKg: null,
    contextState: "loading",
  };
}

const EMPTY_SESSION: DraftSession = {
  title: "",
  sessionType: null,
  workoutFormat: null,
  sessionRpe: null,
  durationInput: "",
  timeCapInput: "",
  location: "",
  bodyweight: "",
  notes: "",
  entries: [],
};

type CommitState = "idle" | "saving" | "error" | "rate" | "offline";

export function ActiveLoggingScreen({
  token,
  weightUnit = "kg",
}: {
  token: string;
  weightUnit?: string;
}) {
  const router = useRouter();
  const client = useMemo(() => createApiClient(token), [token]);
  const timer = useRestTimer();
  const [openedAt] = useState(() => Date.now());

  const [session, setSession] = useState<DraftSession>(EMPTY_SESSION);
  const [sheet, setSheet] = useState<
    | null
    | "search"
    | "calc"
    | "discard"
    | "save-routine"
    | "chooser"
    | "quick"
    | "tag"
    | "routines"
  >(null);
  const [calcTarget, setCalcTarget] = useState(0);
  const [prPill, setPrPill] = useState<string | null>(null);
  const [commitState, setCommitState] = useState<CommitState>("idle");
  const [routineName, setRoutineName] = useState("");
  const [routineError, setRoutineError] = useState<string | null>(null);

  const hasData = session.entries.length > 0;
  const volumeKg = computeVolumeKg(session);
  const setCount = countSets(session);

  const patchSession = useCallback((p: Partial<DraftSession>) => {
    setSession((s) => ({ ...s, ...p }));
  }, []);

  const updateEntry = useCallback(
    (entryId: string, fn: (e: DraftEntry) => DraftEntry) => {
      setSession((s) => ({
        ...s,
        entries: s.entries.map((e) => (e.id === entryId ? fn(e) : e)),
      }));
    },
    [],
  );

  const fetchContext = useCallback(
    async (entry: DraftEntry) => {
      updateEntry(entry.id, (e) => ({ ...e, contextState: "loading" }));
      const params = {
        implement: entry.implement ?? undefined,
        side: entry.side ?? undefined,
      };
      try {
        const [last, pr] = await Promise.allSettled([
          client.movements.lastResult(entry.movement.id, params),
          client.movements.personalRecord(entry.movement.id, params),
        ]);
        const previous =
          last.status === "fulfilled" && last.value.load_kg != null
            ? [{ load: Number(last.value.load_kg), reps: last.value.reps }]
            : [];
        const bestE1rmKg =
          pr.status === "fulfilled" && pr.value?.estimated_1rm_kg != null
            ? Number(pr.value.estimated_1rm_kg)
            : null;
        // A last-result 404 (fulfilled-reject inside allSettled) is a genuine
        // "no previous", distinct from a network error.
        updateEntry(entry.id, (e) => ({
          ...e,
          previous,
          bestE1rmKg,
          contextState: "loaded",
        }));
      } catch {
        updateEntry(entry.id, (e) => ({ ...e, contextState: "error" }));
      }
    },
    [client, updateEntry],
  );

  const addMovement = useCallback(
    (movement: Movement) => {
      const entry = newEntry(movement);
      setSession((s) => ({ ...s, entries: [...s.entries, entry] }));
      setSheet(null);
      void fetchContext(entry);
    },
    [fetchContext],
  );

  const startFromRoutine = useCallback(
    async (routine: SavedRoutine) => {
      // A routine references movements by id; resolve their catalog entries.
      for (const mv of routine.movements ?? []) {
        try {
          const matches = await client.movements.search({
            q: mv.movement_name ?? "",
            limit: 5,
          });
          const found =
            matches.find((m) => m.id === mv.movement_id) ?? matches[0];
          if (found) addMovement(found);
        } catch {
          // Skip a movement that can't be resolved rather than aborting the start.
        }
      }
    },
    [client, addMovement],
  );

  const setSetField = useCallback(
    (entryId: string, setId: string, field: keyof DraftSet, value: string) => {
      updateEntry(entryId, (e) => ({
        ...e,
        sets: e.sets.map((st) =>
          st.id === setId ? { ...st, [field]: value } : st,
        ),
      }));
    },
    [updateEntry],
  );

  const toggleComplete = useCallback(
    (entry: DraftEntry, setId: string) => {
      const target = entry.sets.find((st) => st.id === setId);
      if (!target) return;
      const willComplete = !target.completed;

      // PR detection is computed here (not inside the state updater) so the
      // updater stays pure and setPrPill fires exactly once.
      let isPr = false;
      let newBest = entry.bestE1rmKg;
      if (willComplete && entry.resultType === "weight") {
        const e1 = epley1rm(
          Number(target.load) || null,
          Number(target.reps) || null,
        );
        if (e1 != null && (entry.bestE1rmKg == null || e1 > entry.bestE1rmKg)) {
          isPr = true;
          newBest = e1;
          setPrPill(
            `${entry.movement.name} — Best 1RM ${e1.toFixed(1)} ${weightUnit}`,
          );
        }
      }

      updateEntry(entry.id, (e) => ({
        ...e,
        bestE1rmKg: willComplete ? newBest : e.bestE1rmKg,
        sets: e.sets.map((st) =>
          st.id === setId
            ? {
                ...st,
                completed: willComplete,
                isPr: willComplete ? isPr : false,
              }
            : st,
        ),
      }));

      // Auto-start the rest timer on completion (§2.8), if enabled.
      if (willComplete && timer.enabled) timer.start();
    },
    [updateEntry, timer, weightUnit],
  );

  const copyPrevious = useCallback(
    (entry: DraftEntry, setId: string, setIndex: number) => {
      const prev = entry.previous[setIndex] ?? entry.previous[0];
      if (!prev) return;
      updateEntry(entry.id, (e) => ({
        ...e,
        sets: e.sets.map((st) =>
          st.id === setId
            ? {
                ...st,
                load: prev.load != null ? String(prev.load) : st.load,
                reps: prev.reps != null ? String(prev.reps) : st.reps,
              }
            : st,
        ),
      }));
    },
    [updateEntry],
  );

  const commit = useCallback(async () => {
    setCommitState("saving");
    const performedAt = new Date().toISOString();
    try {
      const created = await client.workouts.create(
        buildCreateWorkout(session, performedAt),
      );
      router.push(`/workouts/${created.short_hash}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) setCommitState("rate");
      else if (err instanceof ApiError) setCommitState("error");
      else setCommitState("offline"); // network failure — session preserved
    }
  }, [client, session, router]);

  async function saveRoutine() {
    const name = routineName.trim();
    if (!name) return;
    setRoutineError(null);
    try {
      await client.routines.create({
        name,
        movements: session.entries.map((e) => ({
          movement_id: e.movement.id,
          implement: e.implement,
          side: e.side,
        })),
      });
      setSheet(null);
      setRoutineName("");
    } catch {
      setRoutineError("Couldn't save the routine. Please try again.");
    }
  }

  function handleBack() {
    if (hasData) setSheet("discard");
    else router.push("/today");
  }

  function handleChoose(mode: LogEntryMode) {
    if (mode === "quick") setSheet("quick");
    else if (mode === "tag") setSheet("tag");
    else if (mode === "describe") router.push("/log/describe");
    else setSheet(null); // "commit" stays here
  }

  return (
    <div className="mx-auto min-h-svh w-full max-w-[760px] px-4 pb-28 pt-3">
      {/* Header (§2.1) */}
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back"
          className="flex h-11 w-11 items-center justify-center font-data text-[18px]"
          style={{ color: "var(--muted)" }}
        >
          ‹
        </button>
        <input
          value={session.title}
          onChange={(e) => patchSession({ title: e.target.value })}
          placeholder="Working tree"
          aria-label="Session title"
          className="flex-1 bg-transparent font-sans text-[16px] font-semibold outline-none"
          style={{ color: "var(--text)" }}
        />
        <button
          type="button"
          onClick={() => setSheet("chooser")}
          aria-label="Logging options"
          className="flex h-11 w-9 items-center justify-center font-data text-[18px]"
          style={{ color: "var(--muted)" }}
        >
          ⊕
        </button>
        <button
          type="button"
          onClick={commit}
          disabled={commitState === "saving"}
          className="rounded-[8px] px-4 py-2 font-sans text-[13px] font-semibold disabled:opacity-60"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {commitState === "saving" ? "Saving…" : "Commit"}
        </button>
      </div>

      <div className="mb-3">
        <SessionSummaryStrip
          openedAt={openedAt}
          volumeKg={volumeKg}
          setCount={setCount}
          weightUnit={weightUnit}
          backdated={false}
        />
      </div>

      {timer.enabled && (
        <div className="mb-3">
          <RestTimer timer={timer} />
        </div>
      )}

      <div className="mb-3">
        <SessionMetadata session={session} patch={patchSession} />
      </div>

      {commitState === "offline" && (
        <div
          className="mb-3 flex items-center justify-between rounded-[8px] px-4 py-2.5"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--amber)",
          }}
        >
          <span
            className="font-sans text-[13px]"
            style={{ color: "var(--text)" }}
          >
            Offline — your logged sets are safe.
          </span>
          <button
            type="button"
            onClick={commit}
            className="font-sans text-[13px] font-semibold"
            style={{ color: "var(--accent)" }}
          >
            Retry
          </button>
        </div>
      )}
      {(commitState === "error" || commitState === "rate") && (
        <div
          className="mb-3 rounded-[8px] px-4 py-2.5"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--red)",
          }}
        >
          <span
            className="font-sans text-[13px]"
            style={{ color: "var(--text)" }}
          >
            {commitState === "rate"
              ? "You're logging very fast — try again in a moment."
              : "Couldn't save — check your connection and retry."}
          </span>
        </div>
      )}

      {!hasData && (
        <TemplatesStart
          token={token}
          onStartFromRoutine={startFromRoutine}
          onPickMovement={() => setSheet("search")}
          onManage={() => setSheet("routines")}
        />
      )}

      <div className="space-y-3">
        {session.entries.map((entry) => (
          <MovementEntryCard
            key={entry.id}
            entry={entry}
            weightUnit={weightUnit}
            onSetChange={(setId, field, value) =>
              setSetField(entry.id, setId, field, value)
            }
            onToggleComplete={(setId) => toggleComplete(entry, setId)}
            onCopyPrevious={(setId, setIndex) =>
              copyPrevious(entry, setId, setIndex)
            }
            onAddSet={() =>
              updateEntry(entry.id, (e) => ({
                ...e,
                sets: [...e.sets, emptySet()],
              }))
            }
            onOpenCalculator={(setId) => {
              const st = entry.sets.find((s) => s.id === setId);
              setCalcTarget(Number(st?.load) || 0);
              setSheet("calc");
            }}
            onRemove={() =>
              setSession((s) => ({
                ...s,
                entries: s.entries.filter((e) => e.id !== entry.id),
              }))
            }
            onSetScaled={(scaled) =>
              updateEntry(entry.id, (e) => ({ ...e, scaled }))
            }
            onRetryContext={() => void fetchContext(entry)}
          />
        ))}
      </div>

      {/* + Add movement (§2.1), disabled at the 10-entry cap */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setSheet("search")}
          disabled={session.entries.length >= MAX_ENTRIES}
          className="w-full rounded-[10px] py-3 font-sans text-[14px] font-medium disabled:opacity-50"
          style={{
            background: "var(--surface)",
            border: "1px dashed var(--border)",
            color: "var(--accent)",
          }}
        >
          + Add movement
        </button>
        {session.entries.length >= MAX_ENTRIES && (
          <p
            className="mt-1 text-center font-data text-[11px]"
            style={{ color: "var(--muted)" }}
          >
            Movement cap reached (10 per session).
          </p>
        )}
        {hasData && (
          <button
            type="button"
            onClick={() => setSheet("save-routine")}
            className="mt-2 w-full py-2 font-data text-[12px]"
            style={{ color: "var(--muted)" }}
          >
            Save as routine
          </button>
        )}
      </div>

      {prPill && (
        <PRCelebrationPill label={prPill} onDismiss={() => setPrPill(null)} />
      )}

      {sheet === "chooser" && (
        <EntryChooser onChoose={handleChoose} onClose={() => setSheet(null)} />
      )}
      {sheet === "routines" && (
        <MyRoutinesSheet token={token} onClose={() => setSheet(null)} />
      )}
      {sheet === "quick" && (
        <QuickLogSheet
          token={token}
          weightUnit={weightUnit}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === "tag" && (
        <TagMilestoneSheet
          token={token}
          weightUnit={weightUnit}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === "search" && (
        <MovementSearchSheet
          token={token}
          onPick={addMovement}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === "calc" && (
        <PlateCalculatorSheet
          initialTarget={calcTarget}
          weightUnit={weightUnit === "lb" ? "lb" : "kg"}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === "discard" && (
        <SheetOverlay
          title="Discard this session?"
          onClose={() => setSheet(null)}
          maxHeight="40dvh"
        >
          <p
            className="mb-4 font-sans text-[14px]"
            style={{ color: "var(--text)" }}
          >
            Your logged sets won&apos;t be saved.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSheet(null)}
              className="flex-1 rounded-[8px] py-2.5 font-sans text-[14px] font-medium"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              Keep editing
            </button>
            <button
              type="button"
              onClick={() => router.push("/today")}
              className="flex-1 rounded-[8px] py-2.5 font-sans text-[14px] font-semibold"
              style={{ background: "var(--red)", color: "#fff" }}
            >
              Discard
            </button>
          </div>
        </SheetOverlay>
      )}
      {sheet === "save-routine" && (
        <SheetOverlay
          title="Save as routine"
          onClose={() => setSheet(null)}
          maxHeight="40dvh"
        >
          <input
            value={routineName}
            onChange={(e) => setRoutineName(e.target.value)}
            placeholder="Push Day A"
            aria-label="Routine name"
            className="mb-4 w-full rounded-[8px] px-3 py-2 font-sans text-[14px] outline-none"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          />
          {routineError && (
            <p
              className="mb-3 font-sans text-[13px]"
              style={{ color: "var(--red)" }}
            >
              {routineError}
            </p>
          )}
          <button
            type="button"
            onClick={saveRoutine}
            className="w-full rounded-[8px] py-2.5 font-sans text-[14px] font-semibold"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Save routine
          </button>
        </SheetOverlay>
      )}
    </div>
  );
}
