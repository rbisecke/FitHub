"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { WorkoutForm } from "./WorkoutForm";
import { sessionLabel, formatLabel } from "@/lib/display";
import type { Workout, PersonalRecord } from "@/lib/api";
import { MovementTrendChart } from "@/components/analytics/MovementTrendChart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { fmtDistance } from "@/lib/distance";
import { useUserPrefs } from "@/lib/contexts/UserPrefsContext";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

const RESULT_TYPE_LABELS: Record<string, string> = {
  weight: "Weight result",
  reps: "Reps result",
  time: "Time result",
  distance: "Distance result",
  calories: "Calories result",
  height: "Height result",
  rounds_reps: "Rounds + reps",
  pace: "Pace result",
  watts: "Watts result",
};

// Session-type badge colours, mapped to brand tokens (token tints for the
// border/bg so they read as quiet category chips, not solid blocks).
const SESSION_COLOURS: Record<string, string> = {
  metcon: "text-[--amber] border-[--amber]/40 bg-[--amber]/10",
  strength: "text-[--accent] border-[--accent]/40 bg-[--accent]/10",
  skill: "text-[--purple] border-[--purple]/40 bg-[--purple]/10",
  mixed: "text-[--cyan] border-[--cyan]/40 bg-[--cyan]/10",
  rest: "text-[--muted] border-[--border] bg-[--surface-2]",
  deload: "text-[--amber] border-[--amber]/40 bg-[--amber]/10",
  active_recovery: "text-[--green] border-[--green]/40 bg-[--green]/10",
};

export function WorkoutDetailClient({
  workout,
  accessToken,
}: {
  workout: Workout;
  accessToken: string;
}) {
  const router = useRouter();
  const { distanceUnit } = useUserPrefs();
  const [editing, setEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [prMap, setPrMap] = useState<Record<string, number>>({});

  useEffect(() => {
    api.analytics
      .personalRecords(accessToken)
      .then((prs: PersonalRecord[]) => {
        const map: Record<string, number> = {};
        for (const pr of prs) map[pr.movement_id] = pr.best_1rm_kg;
        setPrMap(map);
      })
      .catch(() => {});
  }, [accessToken]);

  // Parse date-only to avoid UTC-midnight → previous-local-day conversion.
  const dateParts = workout.performed_at.slice(0, 10).split("-").map(Number);
  const [y, mo, d] = dateParts as [number, number, number];
  const dateStr = new Date(y, mo - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const isPartner =
    workout.workout_format === "partner" || workout.workout_format === "team";

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.workouts.del(accessToken, workout.id);
      router.push("/history");
    } catch {
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <WorkoutForm
        accessToken={accessToken}
        workoutId={workout.id}
        onSaved={() => {
          setEditing(false);
          router.refresh();
        }}
        initialValues={{
          performed_at: workout.performed_at.slice(0, 10),
          title: workout.title ?? undefined,
          session_type: workout.session_type ?? undefined,
          workout_format: workout.workout_format ?? undefined,
          notes: workout.notes ?? undefined,
          session_rpe:
            workout.session_rpe != null
              ? Number(workout.session_rpe)
              : undefined,
          duration_min: workout.duration_s
            ? Math.round(workout.duration_s / 60)
            : undefined,
          location: workout.location ?? undefined,
          bodyweight_kg:
            workout.bodyweight_kg != null
              ? Number(workout.bodyweight_kg)
              : undefined,
          results: (workout.results ?? []).map((r) => ({
            movement_id: r.movement_id ?? undefined,
            movement_name: r.movement_name ?? undefined,
            result_type: r.result_type,
            load_kg: r.load_kg ?? undefined,
            reps: r.reps ?? undefined,
            notes: r.notes ?? undefined,
          })),
        }}
      />
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/history"
        className="inline-flex items-center gap-1 text-sm text-[--muted] hover:text-[--text] transition-colors"
      >
        ← git log
      </Link>

      {/* Header — hash + badges row with actions top-right */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm text-[--muted-strong]">
              {workout.short_hash}
            </span>
            {workout.session_type && (
              <span
                className={`text-xs border rounded px-1.5 py-0.5 ${
                  SESSION_COLOURS[workout.session_type] ??
                  "text-[--muted] border-[--border]"
                }`}
              >
                {sessionLabel(workout.session_type)}
              </span>
            )}
            {workout.workout_format && !isPartner && (
              <span className="text-xs border border-[--border] bg-[--surface] text-[--muted] rounded px-1.5 py-0.5">
                {formatLabel(workout.workout_format)}
              </span>
            )}
            {isPartner && (
              <span className="text-xs font-mono border border-[--purple]/40 bg-[--purple]/10 text-[--purple] px-2 py-0.5 rounded">
                Co-authored-by
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-[--text] truncate">
            {workout.title ?? "Untitled workout"}
          </h1>
          <p className="text-sm text-[--muted]">{dateStr}</p>
        </div>

        {/* Actions — top right */}
        <div className="flex gap-2 shrink-0 mt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            className="border-[--border] text-[--text]"
          >
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="border-0"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-4 text-sm text-[--muted]">
        {workout.session_rpe != null && (
          <div>
            <span className="text-[--muted-strong] text-xs">Effort</span>{" "}
            <span className="font-mono text-[--text]">
              {workout.session_rpe} / 10
            </span>
          </div>
        )}
        {workout.duration_s != null && (
          <div>
            <span className="text-[--muted-strong] text-xs">Duration</span>{" "}
            <span className="font-mono text-[--text]">
              {Math.round(workout.duration_s / 60)} min
            </span>
          </div>
        )}
        {workout.perceived_load_au != null && (
          <div>
            <span className="text-[--muted-strong] text-xs">Load</span>{" "}
            <span
              className="font-mono text-[--text]"
              title="Training load in arbitrary units (sRPE × duration minutes)"
            >
              {Math.round(workout.perceived_load_au)} AU
            </span>
          </div>
        )}
        {workout.location && (
          <div>
            <span className="text-[--muted-strong] text-xs">Location</span>{" "}
            <span className="text-[--text]">{workout.location}</span>
          </div>
        )}
      </div>

      {/* Notes */}
      {workout.notes && (
        <p className="text-sm text-[--muted] italic border-l-2 border-[--border] pl-3">
          {workout.notes}
        </p>
      )}

      {/* Results */}
      <div>
        <h2 className="text-sm font-medium text-[--text] mb-3">Results</h2>
        {(workout.results ?? []).length === 0 ? (
          <p className="text-sm text-[--muted] font-mono italic">
            No results logged.
          </p>
        ) : (
          <div className="space-y-1">
            {(workout.results ?? []).map((r, i) => {
              const isPr =
                r.movement_id !== null &&
                r.movement_id !== undefined &&
                r.estimated_1rm_kg !== null &&
                r.estimated_1rm_kg !== undefined &&
                prMap[r.movement_id] !== undefined &&
                Math.abs(Number(r.estimated_1rm_kg) - prMap[r.movement_id]!) <
                  0.01;
              return (
                <div
                  key={r.id}
                  className="rounded px-3 py-2 bg-[--surface] text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-[--muted-strong]">
                      {i + 1}
                    </span>
                    <span className="text-[--text] flex-1 min-w-0 truncate">
                      {r.movement_name ? (
                        <span>{r.movement_name}</span>
                      ) : (
                        <span className="text-[--muted] italic">
                          {RESULT_TYPE_LABELS[r.result_type] ?? r.result_type}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-3 text-[--muted] font-mono text-xs">
                      {r.load_kg && (
                        <span>
                          {parseFloat(Number(r.load_kg).toFixed(3))} kg
                        </span>
                      )}
                      {r.reps && <span>× {r.reps}</span>}
                      {r.estimated_1rm_kg && (
                        <span className="text-[--muted-strong]">
                          e1RM {Number(r.estimated_1rm_kg).toFixed(1)} kg
                        </span>
                      )}
                      {r.time_s && <span>{formatTime(r.time_s)}</span>}
                      {r.distance_m && (
                        <span>
                          {fmtDistance(Number(r.distance_m), distanceUnit)}
                        </span>
                      )}
                      {isPr && (
                        <span
                          data-testid="result-pr-label"
                          className="bg-[--green]/15 text-[--green] rounded px-1.5 py-0.5 font-mono font-semibold"
                        >
                          PR
                        </span>
                      )}
                    </div>
                  </div>
                  {r.movement_id && r.estimated_1rm_kg && (
                    <MovementTrendChart
                      movementId={r.movement_id}
                      token={accessToken}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Separator className="border-[--border]" />

      {/* Commit info footer */}
      <div className="text-xs text-[--muted] space-y-0.5">
        <p>
          <span className="font-mono">commit {workout.short_hash}</span>
        </p>
        <p>
          Created{" "}
          {new Date(workout.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZoneName: "short",
          })}
        </p>
      </div>

      {/* Delete confirm dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-[--surface-3] border-[--border]">
          <DialogHeader>
            <DialogTitle className="text-[--text]">Delete workout?</DialogTitle>
            <DialogDescription className="text-[--muted-strong]">
              This will permanently delete{" "}
              <span className="font-mono text-[--muted-strong]">
                {workout.short_hash}
              </span>{" "}
              — {workout.title ?? "Untitled workout"}. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-2">
            <DialogClose className="inline-flex items-center justify-center rounded-lg border border-[--border] bg-transparent px-2.5 py-1.5 text-sm font-medium text-[--text] transition-colors hover:bg-[--surface-2] hover:text-[--text] focus-visible:outline-none">
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
