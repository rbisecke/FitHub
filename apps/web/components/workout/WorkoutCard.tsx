"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";
import type { WorkoutSummary, Workout } from "@/lib/api";
import { sessionLabel, formatLabel, loadDisplay } from "@/lib/display";
import { api } from "@/lib/api/client";
import { isBenchmark } from "@/lib/workout/benchmarks";
import { relativeDate } from "@/lib/display";

const SESSION_COLOURS: Record<string, string> = {
  metcon: "text-orange-400 border-orange-800 bg-orange-950",
  strength: "text-blue-400 border-blue-800 bg-blue-950",
  skill: "text-purple-400 border-purple-800 bg-purple-950",
  mixed: "text-teal-400 border-teal-800 bg-teal-950",
  rest: "text-zinc-400 border-zinc-700 bg-zinc-900",
  deload: "text-yellow-400 border-yellow-800 bg-yellow-950",
  active_recovery: "text-green-400 border-green-800 bg-green-950",
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

export interface WorkoutCardProps {
  workout: WorkoutSummary;
  isExpanded: boolean;
  onToggle: () => void;
  accessToken: string;
  onMovementFilter?: (m: { id: string; name: string }) => void;
}

export function WorkoutCard({
  workout,
  isExpanded,
  onToggle,
  accessToken,
  onMovementFilter,
}: WorkoutCardProps) {
  const [detail, setDetail] = useState<Workout | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const fetchedRef = useRef(false);
  const prefersReduced = useReducedMotion();

  const isPartner =
    workout.workout_format === "partner" || workout.workout_format === "team";
  const showBenchmark = isBenchmark(workout.title);

  const dateStr = workout.performed_at.slice(0, 10);
  const [y, mo, d] = dateStr.split("-").map(Number) as [number, number, number];
  const relativeDateLabel = relativeDate(dateStr);
  const absoluteDateLabel = new Date(y, mo - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  useEffect(() => {
    if (isExpanded && !fetchedRef.current) {
      fetchedRef.current = true;
      setDetailLoading(true);
      api.workouts
        .get(accessToken, workout.id)
        .then((w) => setDetail(w))
        .catch(() => {})
        .finally(() => setDetailLoading(false));
    }
  }, [isExpanded, accessToken, workout.id]);

  const expandTransition = prefersReduced
    ? { duration: 0 }
    : { duration: 0.2, ease: "easeInOut" as const };

  return (
    <div
      data-testid="workout-card"
      className="rounded-lg border border-[#30363d] bg-[#161b22] overflow-hidden transition-colors hover:border-[#58a6ff]/40"
    >
      {/* Collapsed header */}
      <button
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={`workout-detail-${workout.id}`}
        className="w-full text-left px-4 py-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58a6ff] focus-visible:ring-inset"
        aria-label={`Toggle details for ${workout.title ?? "Untitled workout"}`}
      >
        {/* Row 1: hash + title + badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span
              aria-hidden="true"
              className="text-orange-400 text-xs select-none"
            >
              ◉
            </span>
            <span className="font-mono text-xs text-orange-400">
              <span className="sr-only">Workout ID: </span>
              {workout.short_hash}
            </span>
            <span className="font-medium text-[#e6edf3]">
              {workout.title ?? "Untitled workout"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            {showBenchmark && (
              <span
                className="text-xs font-mono px-1.5 py-0.5 rounded border border-[#58a6ff]/40 bg-[#58a6ff]/10 text-[#58a6ff]"
                aria-label="Named CrossFit benchmark workout"
              >
                BENCHMARK
              </span>
            )}
            {isPartner && (
              <span className="text-xs font-mono border border-purple-800 bg-purple-950 text-purple-300 px-1.5 py-0.5 rounded">
                Co-authored-by
              </span>
            )}
            {workout.has_pr && (
              <span
                className="text-xs font-semibold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300"
                aria-label="Personal record achieved"
                data-testid="pr-badge"
              >
                PR
              </span>
            )}
          </div>
        </div>

        {/* Row 2: date */}
        <div className="mt-1 font-mono text-xs text-[#8b949e]">
          <span>{relativeDateLabel}</span>
          <span aria-hidden="true" className="mx-1">
            ·
          </span>
          <span>{absoluteDateLabel}</span>
        </div>

        {/* Row 3: movement summary (count fallback until API adds movement_names[]) */}
        {workout.result_count > 0 && (
          <p className="mt-0.5 text-xs text-[#8b949e]">
            {workout.result_count === 1
              ? "1 result"
              : `${workout.result_count} results`}
          </p>
        )}
      </button>

      {/* Expanded content — animated with Motion */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id={`workout-detail-${workout.id}`}
            key="expanded"
            initial={prefersReduced ? {} : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={prefersReduced ? {} : { opacity: 0, height: 0 }}
            transition={expandTransition}
            style={{ overflow: "hidden" }}
          >
            <div className="border-t border-[#30363d] px-4 py-4 space-y-4">
              {detailLoading ? (
                <ExpandedSkeleton />
              ) : detail ? (
                <ExpandedContent
                  workout={detail}
                  summary={workout}
                  onMovementFilter={onMovementFilter}
                />
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ExpandedSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-3/4 bg-[#21262d]" />
      <Skeleton className="h-4 w-1/2 bg-[#21262d]" />
      <Skeleton className="h-4 w-2/3 bg-[#21262d]" />
      <div className="pt-1 grid grid-cols-2 gap-4">
        <Skeleton className="h-16 bg-[#21262d]" />
        <Skeleton className="h-16 bg-[#21262d]" />
      </div>
    </div>
  );
}

function ExpandedContent({
  workout,
  summary,
  onMovementFilter,
}: {
  workout: Workout;
  summary: WorkoutSummary;
  onMovementFilter?: (m: { id: string; name: string }) => void;
}) {
  const dateStr = summary.performed_at.slice(0, 10);
  const [y, mo, d] = dateStr.split("-").map(Number) as [number, number, number];
  const fullDateLabel = new Date(y, mo - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const results = workout.results ?? [];
  const loadAu = loadDisplay(workout.perceived_load_au);
  const isPartner =
    workout.workout_format === "partner" || workout.workout_format === "team";

  return (
    <div className="space-y-4">
      <p className="text-xs font-mono text-[#8b949e]">{fullDateLabel}</p>

      {/* Two-column layout on desktop */}
      <div className="md:grid md:grid-cols-2 md:gap-6 space-y-4 md:space-y-0">
        {/* Results */}
        <div>
          <h3 className="text-xs font-medium text-[#8b949e] uppercase tracking-wider mb-2">
            Results
          </h3>
          {results.length === 0 ? (
            <p className="text-xs font-mono text-[#8b949e] italic">
              No results logged.
            </p>
          ) : (
            <div className="space-y-3">
              {results.map((r, i) => (
                <div key={r.id} className="flex items-start gap-2 text-xs">
                  <span className="font-mono text-[#8b949e] w-4 shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[#e6edf3]">
                        {r.movement_name ?? "—"}
                      </span>
                      <span className="font-mono text-[#8b949e]">
                        {r.load_kg &&
                          `${parseFloat(Number(r.load_kg).toFixed(3))} kg`}
                        {r.reps && ` × ${r.reps}`}
                        {r.time_s && formatTime(r.time_s)}
                      </span>
                      {r.estimated_1rm_kg && (
                        <span className="font-mono text-[#8b949e]">
                          e1RM {Number(r.estimated_1rm_kg).toFixed(1)} kg
                        </span>
                      )}
                      {r.is_pr && (
                        <span
                          data-testid="result-pr-label"
                          className="text-xs font-semibold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300"
                        >
                          PR
                        </span>
                      )}
                    </div>
                    {r.movement_id && r.movement_name && onMovementFilter && (
                      <button
                        onClick={() =>
                          onMovementFilter({
                            id: r.movement_id!,
                            name: r.movement_name!,
                          })
                        }
                        className="text-xs text-[#58a6ff] hover:underline font-mono mt-0.5 block"
                      >
                        See all {r.movement_name} history →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Session meta */}
        <div>
          <h3 className="text-xs font-medium text-[#8b949e] uppercase tracking-wider mb-2">
            Session
          </h3>
          <div className="space-y-1.5 text-xs">
            {workout.session_type && (
              <div className="flex items-center gap-2">
                <span className="text-[#8b949e] w-20 shrink-0">Type</span>
                <span
                  className={`border rounded px-1.5 py-0.5 ${
                    SESSION_COLOURS[workout.session_type] ??
                    "text-zinc-400 border-zinc-700"
                  }`}
                >
                  {sessionLabel(workout.session_type)}
                </span>
              </div>
            )}
            {workout.workout_format && !isPartner && (
              <div className="flex items-center gap-2">
                <span className="text-[#8b949e] w-20 shrink-0">Format</span>
                <span className="text-[#e6edf3]">
                  {formatLabel(workout.workout_format)}
                </span>
              </div>
            )}
            {workout.duration_s != null && (
              <div className="flex items-center gap-2">
                <span className="text-[#8b949e] w-20 shrink-0">Duration</span>
                <span className="font-mono text-[#e6edf3]">
                  {Math.round(workout.duration_s / 60)} min
                </span>
              </div>
            )}
            {workout.session_rpe != null && (
              <div className="flex items-center gap-2">
                <span className="text-[#8b949e] w-20 shrink-0">
                  Effort (RPE)
                </span>
                <span className="font-mono text-[#e6edf3]">
                  {workout.session_rpe} / 10
                </span>
              </div>
            )}
            {loadAu && (
              <div className="flex items-center gap-2">
                <span className="text-[#8b949e] w-20 shrink-0">Load</span>
                <span
                  className="font-mono text-[#e6edf3]"
                  title="Training load (sRPE × duration minutes)"
                >
                  {loadAu} AU
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      {workout.notes && (
        <p className="text-xs text-[#8b949e] italic border-l-2 border-[#30363d] pl-3">
          {workout.notes}
        </p>
      )}

      {/* Footer: git show + links */}
      <div className="flex items-center justify-between pt-2 border-t border-[#30363d]">
        <span className="font-mono text-xs text-[#8b949e]">
          git show {summary.short_hash}
        </span>
        <div className="flex items-center gap-4">
          <Link
            href={`/history/${summary.id}`}
            className="text-xs text-[#58a6ff] hover:underline font-mono"
          >
            Edit →
          </Link>
          <Link
            href={`/history/${summary.id}`}
            className="text-xs text-[#8b949e] hover:text-[#e6edf3] font-mono"
          >
            Full page →
          </Link>
        </div>
      </div>
    </div>
  );
}
