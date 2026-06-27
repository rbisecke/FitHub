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
import { fmtDistance, type DistanceUnit } from "@/lib/distance";
import { useUserPrefs } from "@/lib/contexts/UserPrefsContext";

// Session-type badge colours mapped to brand tokens (token tints for border/bg),
// matching WorkoutDetailClient so the list + detail read identically.
const SESSION_COLOURS: Record<string, string> = {
  metcon: "text-[--amber] border-[--amber]/40 bg-[--amber]/10",
  strength: "text-[--accent] border-[--accent]/40 bg-[--accent]/10",
  skill: "text-[--purple] border-[--purple]/40 bg-[--purple]/10",
  mixed: "text-[--cyan] border-[--cyan]/40 bg-[--cyan]/10",
  rest: "text-[--muted] border-[--border] bg-[--surface-2]",
  deload: "text-[--amber] border-[--amber]/40 bg-[--amber]/10",
  active_recovery: "text-[--green] border-[--green]/40 bg-[--green]/10",
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

// Without B7 (is_tag column), tag entries are detected by absence of session_type + single result.
// This is a fragile fallback — update when B7 ships.
function isTagEntry(w: WorkoutSummary): boolean {
  return !w.session_type && w.result_count === 1;
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

  const isTag = isTagEntry(workout);
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

  // Compact non-interactive tag card
  if (isTag) {
    return (
      <TagCard
        workout={workout}
        detail={detail}
        detailLoading={detailLoading}
        accessToken={accessToken}
      />
    );
  }

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
              className="text-[--muted-strong] text-xs select-none"
            >
              ◉
            </span>
            <span className="font-mono text-xs text-[--muted-strong]">
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
              <span className="text-xs font-mono border border-[--purple]/40 bg-[--purple]/10 text-[--purple] px-1.5 py-0.5 rounded">
                Co-authored-by
              </span>
            )}
            {workout.has_pr && (
              <span
                className="text-xs font-semibold px-1.5 py-0.5 rounded bg-[--green]/15 text-[--green]"
                aria-label="Personal record achieved"
                data-testid="pr-badge"
              >
                PR
              </span>
            )}
          </div>
        </div>

        {/* Row 2: date — omit the dot+absolute when relativeDate returns same string */}
        <div className="mt-1 font-mono text-xs text-[#8b949e]">
          {relativeDateLabel !== absoluteDateLabel ? (
            <>
              <span>{relativeDateLabel}</span>
              <span aria-hidden="true" className="mx-1">
                ·
              </span>
              <span>{absoluteDateLabel}</span>
            </>
          ) : (
            <span>{absoluteDateLabel}</span>
          )}
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
  const { distanceUnit } = useUserPrefs();
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
                      {r.movement_name && (
                        <span className="text-[#e6edf3]">
                          {r.movement_name}
                        </span>
                      )}
                      <span className="font-mono text-[#8b949e]">
                        {r.load_kg &&
                          `${parseFloat(Number(r.load_kg).toFixed(3))} kg`}
                        {r.reps && ` × ${r.reps}`}
                        {r.time_s && formatTime(r.time_s)}
                        {r.distance_m &&
                          fmtDistance(Number(r.distance_m), distanceUnit)}
                      </span>
                      {r.estimated_1rm_kg && (
                        <span className="font-mono text-[#8b949e]">
                          e1RM {Number(r.estimated_1rm_kg).toFixed(1)} kg
                        </span>
                      )}
                      {r.is_pr && (
                        <span
                          data-testid="result-pr-label"
                          className="text-xs font-semibold px-1.5 py-0.5 rounded bg-[--green]/15 text-[--green]"
                        >
                          PR
                        </span>
                      )}
                    </div>
                    {r.variant_annotation && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {r.variant_annotation.split(",").map((chip) => (
                          <span
                            key={chip}
                            className="font-mono text-[10px] px-1 py-0.5 rounded border border-[#30363d] bg-[#161b22] text-[#8b949e]"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    )}
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
                    "text-[--muted] border-[--border]"
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
                  {Number(workout.session_rpe)} / 10
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

// ── Tag card ─────────────────────────────────────────────────────────────────

function formatResultValue(
  r: {
    result_type: string;
    load_kg?: string | number | null;
    reps?: number | null;
    time_s?: number | null;
    distance_m?: string | number | null;
    calories?: number | null;
    rounds?: number | null;
    partial_reps?: number | null;
    watts?: number | null;
  },
  distanceUnit: DistanceUnit,
): string {
  if (r.result_type === "weight") {
    const load = r.load_kg != null ? String(r.load_kg) : null;
    if (!load) return "";
    return r.reps != null ? `${load} kg × ${r.reps}` : `${load} kg`;
  }
  if (r.result_type === "reps") return r.reps != null ? `${r.reps} reps` : "";
  if (r.result_type === "time" && r.time_s != null) {
    const m = Math.floor(r.time_s / 60);
    const s = r.time_s % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  if (r.result_type === "distance" && r.distance_m != null) {
    return fmtDistance(Number(r.distance_m), distanceUnit);
  }
  if (r.result_type === "calories")
    return r.calories != null ? `${r.calories} cal` : "";
  if (r.result_type === "rounds_reps" && r.rounds != null) {
    return r.partial_reps != null
      ? `${r.rounds} + ${r.partial_reps} reps`
      : `${r.rounds} rounds`;
  }
  if (r.result_type === "watts") return r.watts != null ? `${r.watts} W` : "";
  return "";
}

function TagCard({
  workout,
  detail,
  detailLoading,
  accessToken,
}: {
  workout: WorkoutSummary;
  detail: Workout | null;
  detailLoading: boolean;
  accessToken: string;
}) {
  const { distanceUnit } = useUserPrefs();
  const [localDetail, setLocalDetail] = useState<Workout | null>(detail);
  const [loading, setLoading] = useState(detailLoading);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    api.workouts
      .get(accessToken, workout.id)
      .then((w) => setLocalDetail(w))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken, workout.id]);

  const result = localDetail?.results?.[0];
  const movementName = result?.movement_name ?? null;
  const resultValue = result ? formatResultValue(result, distanceUnit) : null;

  const dateStr = workout.performed_at.slice(0, 10);
  const [y, mo, d] = dateStr.split("-").map(Number) as [number, number, number];
  const dateLabel = new Date(y, mo - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      data-testid="tag-card"
      className="rounded-lg border border-[#30363d] px-4 py-3 transition-colors hover:border-[#58a6ff]/20"
    >
      {loading ? (
        <div className="flex items-center gap-2 font-mono text-xs text-[#8b949e]">
          <span>🏷</span>
          <span className="text-[#8b949e]">Loading…</span>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 font-mono text-sm min-w-0">
              <span aria-hidden>🏷</span>
              {movementName && (
                <span className="text-[#e6edf3] truncate">{movementName}</span>
              )}
              {resultValue && (
                <>
                  <span className="text-[#8b949e]">·</span>
                  <span className="text-[#e6edf3]">{resultValue}</span>
                </>
              )}
              {workout.has_pr && (
                <span
                  className="ml-1 text-xs font-semibold px-1.5 py-0.5 rounded bg-[--green]/15 text-[--green]"
                  aria-label="Personal record"
                >
                  PR
                </span>
              )}
            </div>
            <span className="shrink-0 font-mono text-xs text-[#8b949e]">
              {dateLabel}
            </span>
          </div>
          {localDetail?.notes && (
            <p className="mt-1 font-mono text-xs text-[#8b949e] pl-6">
              {localDetail.notes}
            </p>
          )}
        </>
      )}
    </div>
  );
}
