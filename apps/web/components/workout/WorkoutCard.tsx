"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  WorkoutSummary,
  Workout,
  TeamSession,
  TeamSessionParticipant,
} from "@/lib/api";
import {
  sessionLabel,
  formatLabel,
  loadDisplay,
  formatWeight,
} from "@/lib/display";
import { api } from "@/lib/api/client";
import { isBenchmark } from "@/lib/workout/benchmarks";
import { relativeDate } from "@/lib/display";
import { fmtDistance, type DistanceUnit } from "@/lib/distance";
import { useUserPrefs } from "@/lib/contexts/UserPrefsContext";
import { TeamSessionSheet } from "@/components/team-sessions/TeamSessionSheet";

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

const ROLE_COLORS: Record<string, string> = {
  rx: "#4ADE80",
  scaled: "#FFC83D",
  coach: "#8b5cf6",
  athlete: "#58a6ff",
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

export function formatTeamScore(ts: TeamSession): string {
  if (ts.team_score_s != null) {
    const m = Math.floor(ts.team_score_s / 60);
    const s = ts.team_score_s % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  if (ts.team_score_reps != null) return `${ts.team_score_reps} reps`;
  if (ts.team_score) return ts.team_score;
  return "";
}

export function teamScoreLabel(scoringType: string | null | undefined): string {
  const map: Record<string, string> = {
    for_time: "team time",
    relay: "relay time",
    slowest_finisher: "slowest",
    max_load: "max load",
    total_reps: "total reps",
    amrap: "score",
  };
  return scoringType ? map[scoringType] ?? "team score" : "team score";
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

  // Team session: null = not checked, false = no session, TeamSession = linked
  const [teamSession, setTeamSession] = useState<TeamSession | null | false>(
    null,
  );
  const teamSessionChecked = useRef(false);

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

  // Lazy fetch team session when card is first expanded
  useEffect(() => {
    if (isExpanded && !teamSessionChecked.current) {
      teamSessionChecked.current = true;
      api.teamSessions
        .getWorkoutTeamSession(accessToken, workout.id)
        .then((ts) => setTeamSession(ts))
        .catch(() => setTeamSession(false));
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
        isExpanded={isExpanded}
      />
    );
  }

  return (
    <div data-testid="workout-card">
      {/* Mobile: flat non-expanding card */}
      <div className="md:hidden flex gap-[11px] bg-[var(--card)] border border-[var(--border)] rounded-[13px] p-[13px_14px]">
        <div className="w-[28px] h-[28px] rounded-[7px] bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 mt-[1px]">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="3.2" />
            <path d="M12 2v6.8M12 15.2V22" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-[7px] flex-wrap">
            <span className="font-semibold text-[13px] text-[var(--foreground)]">
              {workout.title ?? "Untitled workout"}
            </span>
            {workout.has_pr && (
              <span
                className="font-data text-[9.5px] font-bold px-[7px] py-[1px] rounded-full flex-shrink-0"
                style={{
                  color: "var(--gold)",
                  background: "rgba(255,200,61,0.14)",
                  border: "1px solid rgba(255,200,61,0.3)",
                }}
              >
                🏆 PR
              </span>
            )}
          </div>
          <div className="font-data text-[10.5px] text-[var(--muted-foreground)] mt-[4px]">
            <span style={{ color: "var(--gold)" }}>{workout.short_hash}</span>
            {" · "}
            {relativeDateLabel}
            {workout.session_type && ` · ${workout.session_type}`}
          </div>
        </div>
      </div>

      {/* Desktop: expand/collapse card */}
      <div
        className={`hidden md:block rounded-lg border bg-[var(--card)] overflow-hidden transition-colors ${
          workout.has_pr
            ? "border-[var(--border)] hover:border-[rgba(255,200,61,0.5)]"
            : "border-[var(--border)] hover:border-[var(--muted-foreground)]/40"
        }`}
      >
        {/* Collapsed header */}
        <button
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-controls={`workout-detail-${workout.id}`}
          className="w-full text-left px-4 py-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58a6ff] focus-visible:ring-inset"
          aria-label={`Toggle details for ${
            workout.title ?? "Untitled workout"
          }`}
        >
          {/* Row 1: hash + title + badges */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <div
                className="shrink-0 z-[1]"
                style={{
                  width: 13,
                  height: 13,
                  borderRadius: "50%",
                  background: "var(--card)",
                  border: "2px solid var(--gold)",
                  boxShadow: "0 0 0 3px var(--background)",
                }}
                aria-hidden="true"
              />
              <span className="font-data text-[12px] text-[var(--gold)] font-semibold">
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
                <svg
                  width="14"
                  height="10"
                  viewBox="0 0 14 10"
                  aria-hidden="true"
                >
                  <circle
                    cx="4.5"
                    cy="5"
                    r="3.5"
                    stroke="#8b949e"
                    strokeWidth="1.3"
                    fill="none"
                  />
                  <circle
                    cx="9.5"
                    cy="5"
                    r="3.5"
                    stroke="#8b949e"
                    strokeWidth="1.3"
                    fill="none"
                  />
                </svg>
              )}
              {workout.session_type && (
                <span
                  className="text-[10.5px] font-bold px-[9px] py-0.5 rounded-full whitespace-nowrap flex-shrink-0"
                  style={{
                    color: "var(--hot)",
                    background: "rgba(255, 122, 69, 0.14)",
                    border: "1px solid rgba(255, 122, 69, 0.3)",
                  }}
                >
                  {workout.session_type.charAt(0).toUpperCase() +
                    workout.session_type.slice(1)}
                </span>
              )}
              {workout.has_pr && (
                <span
                  className="text-[10.5px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0"
                  style={{
                    background: "rgba(255, 200, 61, 0.14)",
                    color: "var(--gold)",
                    border: "1px solid rgba(255, 200, 61, 0.3)",
                  }}
                  aria-label="Personal record achieved"
                  data-testid="pr-badge"
                >
                  🏆 PR
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
                    accessToken={accessToken}
                    onMovementFilter={onMovementFilter}
                    teamSession={teamSession}
                    setTeamSession={setTeamSession}
                  />
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
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
  accessToken,
  onMovementFilter,
  teamSession,
  setTeamSession,
}: {
  workout: Workout;
  summary: WorkoutSummary;
  accessToken: string;
  onMovementFilter?: (m: { id: string; name: string }) => void;
  teamSession: TeamSession | null | false;
  setTeamSession: (ts: TeamSession | null | false) => void;
}) {
  const { distanceUnit, weightUnit } = useUserPrefs();
  const unit = weightUnit === "lb" ? "lb" : "kg";
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

  const [sheetOpen, setSheetOpen] = useState(false);

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
                        {r.load_kg && formatWeight(Number(r.load_kg), unit)}
                        {r.reps && ` × ${r.reps}`}
                        {r.time_s && formatTime(r.time_s)}
                        {r.distance_m &&
                          fmtDistance(Number(r.distance_m), distanceUnit)}
                      </span>
                      {r.estimated_1rm_kg && (
                        <span className="font-mono text-[#8b949e]">
                          e1RM {formatWeight(Number(r.estimated_1rm_kg), unit)}
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
                    {(r.implement ||
                      r.tempo ||
                      r.side ||
                      r.variant_annotation) && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {r.implement && (
                          <span className="font-mono text-[10px] px-1 py-0.5 rounded border border-[#30363d] bg-[#161b22] text-[#8b949e]">
                            {r.implement}
                          </span>
                        )}
                        {r.tempo && (
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-[#58a6ff]/40 bg-[#58a6ff]/10 text-[#58a6ff]">
                            {r.tempo}
                          </span>
                        )}
                        {r.side && (
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-[rgba(255,200,61,0.4)] bg-[rgba(255,200,61,0.12)] text-[var(--gold)] capitalize">
                            {r.side}
                          </span>
                        )}
                        {r.variant_annotation &&
                          r.variant_annotation.split(",").map((chip, ci) => (
                            <span
                              key={ci}
                              className="font-mono text-[10px] px-1 py-0.5 rounded border border-[#30363d] bg-[#161b22] text-[#8b949e]"
                            >
                              {chip}
                            </span>
                          ))}
                      </div>
                    )}
                    {r.notes && (
                      <p className="text-xs italic text-[#8b949e] mt-0.5">
                        {r.notes}
                      </p>
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

      {/* Co-authored-by section — shows when a team session is linked */}
      {teamSession && (
        <div>
          <p className="text-xs font-mono text-[--muted] mb-2">
            co-authored-by
          </p>
          <div className="flex flex-wrap gap-3 mb-2">
            {(teamSession.participants?.slice(0, 3) ?? []).map(
              (p: TeamSessionParticipant, i: number) => {
                const roleColor = ROLE_COLORS[p.role ?? "athlete"] ?? "#58a6ff";
                const name = p.display_name ?? p.guest_name ?? "?";
                const initial = name.charAt(0).toUpperCase();
                return (
                  <div key={p.id ?? i} className="flex items-center gap-1.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold flex-shrink-0"
                      style={{
                        background: roleColor + "26",
                        color: roleColor,
                      }}
                    >
                      {initial}
                    </div>
                    <span className="text-xs text-[--text]">{name}</span>
                    {p.role && (
                      <span
                        style={{
                          borderLeft: `2px solid ${roleColor}`,
                          background: roleColor + "26",
                          color: roleColor,
                          padding: "1px 6px",
                          borderRadius: 99,
                          fontSize: 10,
                          fontFamily: "monospace",
                          flexShrink: 0,
                        }}
                      >
                        {p.role}
                      </span>
                    )}
                  </div>
                );
              },
            )}
            {(teamSession.participants?.length ?? 0) > 3 && (
              <span className="text-xs text-[--muted] font-mono self-center">
                +{(teamSession.participants?.length ?? 0) - 3} more
              </span>
            )}
          </div>
          {(() => {
            const score = formatTeamScore(teamSession);
            if (!score) return null;
            const label = teamScoreLabel(
              (teamSession.scoring_type as string | null | undefined) ?? null,
            );
            return (
              <p className="text-xs font-mono mb-1">
                <span className="text-[--muted]">{label}: </span>
                <span className="text-[--blue]">{score}</span>
              </p>
            );
          })()}
          <Link
            href={`/team-sessions/${teamSession.id}`}
            className="text-xs font-mono text-[--blue] hover:underline"
          >
            view team session →
          </Link>
        </div>
      )}

      {/* Footer: git show + action buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-[#30363d]">
        <span className="font-data text-xs text-[var(--muted-foreground)]">
          git show {summary.short_hash}
        </span>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Team session create button — only when definitively no session */}
          {teamSession === false && (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="flex items-center gap-1 text-[11px] font-mono border border-[#30363d] text-[#8b949e] hover:border-[rgba(88,166,255,0.4)] hover:text-[#58a6ff] px-[10px] py-1.5 rounded-[7px] transition-colors"
              data-testid="mark-team-session-btn"
            >
              ⊕ team session
            </button>
          )}
          <Link
            href={`/history/${summary.id}`}
            className="flex items-center gap-1 text-[12px] font-semibold bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] px-[13px] py-2 rounded-[9px] hover:border-[var(--muted-foreground)] transition-colors"
          >
            ✎ Edit
          </Link>
          <Link
            href={`/history/${summary.id}`}
            className="flex items-center gap-1 text-[12px] font-bold bg-[rgba(74,222,128,0.12)] border border-[rgba(74,222,128,0.3)] text-[var(--accent)] px-[13px] py-2 rounded-[9px] hover:bg-[rgba(74,222,128,0.2)] transition-colors"
          >
            View full detail →
          </Link>
        </div>
      </div>

      {/* Team session creation sheet */}
      <TeamSessionSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        workoutId={summary.id}
        performedAt={summary.performed_at}
        accessToken={accessToken}
        onCreated={(session) => setTeamSession(session)}
      />
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
  wUnit: "kg" | "lb" = "kg",
): string {
  if (r.result_type === "weight") {
    if (r.load_kg == null) return "";
    const display = formatWeight(Number(r.load_kg), wUnit);
    return r.reps != null ? `${display} × ${r.reps}` : display;
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
  isExpanded,
}: {
  workout: WorkoutSummary;
  detail: Workout | null;
  detailLoading: boolean;
  accessToken: string;
  isExpanded: boolean;
}) {
  const { distanceUnit, weightUnit } = useUserPrefs();
  const unit = weightUnit === "lb" ? "lb" : "kg";
  const [localDetail, setLocalDetail] = useState<Workout | null>(detail);
  const [loading, setLoading] = useState(detailLoading);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!isExpanded) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    api.workouts
      .get(accessToken, workout.id)
      .then((w) => setLocalDetail(w))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isExpanded, accessToken, workout.id]);

  const result = localDetail?.results?.[0];
  const movementName = result?.movement_name ?? null;
  const resultValue = result
    ? formatResultValue(result, distanceUnit, unit)
    : null;

  const dateStr = workout.performed_at.slice(0, 10);
  const [y, mo, d] = dateStr.split("-").map(Number) as [number, number, number];
  const dateLabel = new Date(y, mo - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div data-testid="tag-card">
      {/* Mobile: flat dashed card */}
      <div className="md:hidden flex items-center gap-[11px] bg-[var(--card)] border border-dashed border-[var(--border)] rounded-[13px] p-[11px_14px]">
        <div
          className="w-[28px] h-[28px] flex items-center justify-center flex-shrink-0"
          style={{ color: "var(--gold)" }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.6 13.4L11 3.8A2 2 0 009.6 3.2H4a1 1 0 00-1 1v5.6a2 2 0 00.6 1.4l9.6 9.6a2 2 0 002.8 0l4.6-4.6a2 2 0 000-2.8z" />
            <circle cx="7.5" cy="7.5" r="1" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          {loading ? (
            <span className="font-data text-[11px] text-[var(--muted-foreground)]">
              Loading…
            </span>
          ) : (
            <>
              <div className="flex items-center gap-[7px] flex-wrap">
                {movementName && (
                  <span className="font-semibold text-[13px] text-[var(--foreground)] truncate">
                    {movementName}
                  </span>
                )}
                {resultValue && (
                  <span className="font-data text-[10.5px] text-[var(--muted-foreground)]">
                    {resultValue}
                  </span>
                )}
                {workout.has_pr && (
                  <span className="font-data text-[9px] font-semibold px-[5px] py-[1px] rounded bg-[rgba(63,185,80,0.15)] text-[var(--green)]">
                    PR
                  </span>
                )}
              </div>
              <div className="font-data text-[10.5px] text-[var(--muted-foreground)] mt-[3px]">
                single result · {dateLabel}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Desktop: original layout */}
      <div className="hidden md:block rounded-lg border border-[#30363d] px-4 py-3 transition-colors hover:border-[#58a6ff]/20">
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
                  <span className="text-[#e6edf3] truncate">
                    {movementName}
                  </span>
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
    </div>
  );
}
