"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { SheetOverlay } from "@/components/logging/SheetOverlay";
import { relativeDate, formatLabel } from "@/lib/display";
import { localDateKey } from "@/lib/units";
import { ApiError, type ApiClient } from "@/lib/api/client";
import type {
  TeamSession,
  TeamSessionParticipant,
  WorkoutSummary,
} from "@/lib/api";

/**
 * Link/relink a participant's workout (06 §4b) — a picker of the acting
 * user's own recent workouts, or a hand-off to "log a new one" (`/log`, the
 * existing logging entry point — not rebuilt here). Forced light (F1). The
 * double-link guard (§2/§4b) is a UX courtesy only: the backend silently
 * moves an already-linked workout rather than rejecting it, so this sheet
 * checks first and confirms before calling the link endpoint, but does not
 * block if the caller proceeds through a race.
 */
export function LinkWorkoutSheet({
  client,
  session,
  participant,
  onClose,
  onLinked,
  onError,
}: {
  client: ApiClient;
  session: TeamSession;
  participant: TeamSessionParticipant;
  onClose: () => void;
  onLinked: (updated: TeamSession) => void;
  onError: (message: string) => void;
}) {
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  const [pendingWorkoutId, setPendingWorkoutId] = useState<string | null>(null);
  const [moveConfirm, setMoveConfirm] = useState<{
    workoutId: string;
    otherSessionName: string;
  } | null>(null);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    client.workouts
      .list({ limit: 10 }, { signal: controller.signal })
      .then((res) => {
        if (!cancelled) {
          setWorkouts(res.items);
          setState("loaded");
        }
      })
      .catch((err) => {
        if (!cancelled && !controller.signal.aborted) {
          setState("error");
          void err;
        }
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [client]);

  async function commitLink(workoutId: string) {
    setLinking(true);
    try {
      const updated = await client.teamSessions.patchParticipant(
        session.id,
        participant.id,
        { workout_id: workoutId },
      );
      onLinked(updated);
      onClose();
    } catch {
      onError("Couldn't link that workout. Please try again.");
    } finally {
      setLinking(false);
      setMoveConfirm(null);
      setPendingWorkoutId(null);
    }
  }

  async function selectWorkout(workoutId: string) {
    setPendingWorkoutId(workoutId);
    try {
      const other = await client.teamSessions.getWorkoutTeamSession(workoutId);
      if (other.id !== session.id) {
        setMoveConfirm({
          workoutId,
          otherSessionName: other.name ?? "another session",
        });
        setPendingWorkoutId(null);
        return;
      }
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        onError("Couldn't check that workout. Please try again.");
        setPendingWorkoutId(null);
        return;
      }
      // 404 = not linked anywhere yet — proceed directly.
    }
    setPendingWorkoutId(null);
    await commitLink(workoutId);
  }

  return (
    <ForcedTheme theme="light">
      <SheetOverlay title="Link your result" onClose={onClose}>
        <div className="flex flex-col gap-3">
          {state === "loading" && (
            <p
              className="font-sans text-[13px]"
              style={{ color: "var(--muted)" }}
            >
              Loading your recent workouts…
            </p>
          )}
          {state === "error" && (
            <p
              className="font-sans text-[13px]"
              style={{ color: "var(--red)" }}
            >
              Couldn&apos;t load your workouts. Please try again.
            </p>
          )}
          {state === "loaded" && workouts.length === 0 && (
            <p
              className="font-sans text-[13px]"
              style={{ color: "var(--muted)" }}
            >
              No recent workouts found.
            </p>
          )}
          {state === "loaded" && workouts.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {workouts.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    disabled={linking || pendingWorkoutId === w.id}
                    onClick={() => void selectWorkout(w.id)}
                    className="flex w-full flex-col rounded-[8px] px-3 py-2 text-left transition-colors disabled:opacity-50"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <span
                      className="font-sans text-[13px] font-medium"
                      style={{ color: "var(--text)" }}
                    >
                      {w.title || formatLabel(w.workout_format) || "Workout"}
                    </span>
                    <span
                      className="font-mono text-[11px] tabular-nums"
                      style={{ color: "var(--muted)" }}
                    >
                      {relativeDate(localDateKey(w.performed_at))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/log"
            className="w-fit font-sans text-[13px] font-medium"
            style={{ color: "var(--accent)" }}
          >
            Log a new workout →
          </Link>
        </div>
      </SheetOverlay>

      {moveConfirm && (
        <SheetOverlay
          title="Move this workout here?"
          onClose={() => (linking ? undefined : setMoveConfirm(null))}
          maxHeight="36dvh"
        >
          <p
            className="mb-4 font-sans text-[14px]"
            style={{ color: "var(--text)" }}
          >
            This workout is already recorded in &lsquo;
            {moveConfirm.otherSessionName}
            &rsquo;. Move it here?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMoveConfirm(null)}
              disabled={linking}
              className="flex-1 rounded-[8px] py-2.5 font-sans text-[14px] font-medium"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void commitLink(moveConfirm.workoutId)}
              disabled={linking}
              className="flex-1 rounded-[8px] py-2.5 font-sans text-[14px] font-semibold"
              style={{
                background: "var(--accent)",
                color: "var(--bg)",
                opacity: linking ? 0.7 : 1,
              }}
            >
              {linking ? "Moving…" : "Move it here"}
            </button>
          </div>
        </SheetOverlay>
      )}
    </ForcedTheme>
  );
}
