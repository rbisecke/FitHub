"use client";

import { useRouter } from "next/navigation";
import type { WorkoutSummary } from "@/lib/api";
import {
  sessionLabel,
  formatLabel,
  loadDisplay,
  relativeDate,
} from "@/lib/display";

const SESSION_COLOURS: Record<string, string> = {
  metcon: "text-orange-400 border-orange-800 bg-orange-950",
  strength: "text-blue-400 border-blue-800 bg-blue-950",
  skill: "text-purple-400 border-purple-800 bg-purple-950",
  mixed: "text-teal-400 border-teal-800 bg-teal-950",
  rest: "text-zinc-400 border-zinc-700 bg-zinc-900",
  deload: "text-yellow-400 border-yellow-800 bg-yellow-950",
  active_recovery: "text-green-400 border-green-800 bg-green-950",
};

export function WorkoutCard({
  workout,
  hideDate = false,
}: {
  workout: WorkoutSummary;
  hideDate?: boolean;
}) {
  const router = useRouter();
  const isPartner =
    workout.workout_format === "partner" || workout.workout_format === "team";

  const dateLabel = relativeDate(workout.performed_at.slice(0, 10));
  const loadAu = loadDisplay(workout.perceived_load_au);

  return (
    <div
      data-testid="workout-card"
      onClick={() => router.push(`/history/${workout.id}`)}
      className="cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-700 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs text-orange-400">
            {workout.short_hash}
          </span>
          <span className="font-medium text-zinc-100">
            {workout.title ?? "Untitled workout"}
          </span>
          {isPartner && (
            <span className="text-xs font-mono border border-purple-800 bg-purple-950 text-purple-300 px-2 py-0.5 rounded">
              Co-authored-by
            </span>
          )}
        </div>
        {!hideDate && (
          <span className="text-xs text-zinc-500 shrink-0">{dateLabel}</span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
        {workout.session_type && (
          <span
            className={`border rounded px-1.5 py-0.5 ${
              SESSION_COLOURS[workout.session_type] ??
              "text-zinc-400 border-zinc-700"
            }`}
          >
            {sessionLabel(workout.session_type)}
          </span>
        )}
        {workout.result_count > 0 && (
          <span>
            {workout.result_count} set{workout.result_count !== 1 ? "s" : ""}
          </span>
        )}
        {loadAu && (
          <span title="Training load (sRPE × duration minutes)">
            Load: {loadAu} AU
          </span>
        )}
        {workout.workout_format && workout.workout_format !== "strength" && (
          <span className="text-zinc-600">
            {formatLabel(workout.workout_format)}
          </span>
        )}
      </div>
    </div>
  );
}
