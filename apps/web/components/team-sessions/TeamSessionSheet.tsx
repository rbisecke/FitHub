"use client";

import { useState, useCallback, useRef } from "react";
import { useReducedMotion } from "motion/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import type { TeamSession, UserSearchResult } from "@/lib/api";

// Role colors matching the design spec (verified 2026-07-04)
const ROLE_COLORS: Record<
  string,
  { text: string; border: string; bg: string }
> = {
  rx: {
    text: "#4ADE80",
    border: "rgba(74,222,128,0.3)",
    bg: "rgba(74,222,128,0.15)",
  },
  scaled: {
    text: "#FFC83D",
    border: "rgba(255,200,61,0.3)",
    bg: "rgba(255,200,61,0.15)",
  },
  coach: {
    text: "#8b5cf6",
    border: "rgba(139,92,246,0.3)",
    bg: "rgba(139,92,246,0.15)",
  },
  athlete: {
    text: "#58a6ff",
    border: "rgba(88,166,255,0.3)",
    bg: "rgba(88,166,255,0.15)",
  },
};

const ROLES = ["rx", "scaled", "coach", "athlete"] as const;
type Role = (typeof ROLES)[number];

const SCORING_TYPES = [
  { value: "for_time", label: "For Time" },
  { value: "amrap", label: "AMRAP" },
  { value: "max_load", label: "Max Load" },
  { value: "total_reps", label: "Total Reps" },
  { value: "relay", label: "Relay" },
  { value: "slowest_finisher", label: "Slowest Finisher" },
] as const;

const SCORE_LABELS: Record<string, string> = {
  for_time: "team time (mm:ss)",
  amrap: "total rounds + reps",
  max_load: "max load (kg)",
  total_reps: "total reps",
  relay: "relay time (mm:ss)",
  slowest_finisher: "slowest time (mm:ss)",
};

function RoleBadge({
  role,
  selected,
  onSelect,
}: {
  role: Role;
  selected: boolean;
  onSelect: () => void;
}) {
  const colors = ROLE_COLORS[role] ?? {
    text: "#58a6ff",
    border: "rgba(88,166,255,0.3)",
    bg: "rgba(88,166,255,0.15)",
  };
  return (
    <button
      type="button"
      onClick={onSelect}
      className="text-[10px] font-mono px-2 py-0.5 rounded border transition-colors"
      style={
        selected
          ? {
              color: colors.text,
              borderColor: colors.border,
              background: colors.bg,
              borderLeftWidth: 2,
            }
          : {
              color: "#8b949e",
              borderColor: "#30363d",
              background: "transparent",
            }
      }
    >
      {role}
    </button>
  );
}

interface Contributor {
  user_id?: string;
  guest_name?: string;
  display_name: string;
  role: Role;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutId: string;
  performedAt: string;
  accessToken: string;
  onCreated?: (session: TeamSession) => void;
}

export function TeamSessionSheet({
  open,
  onOpenChange,
  workoutId,
  performedAt,
  accessToken,
  onCreated,
}: Props) {
  const prefersReduced = useReducedMotion();

  const [sessionName, setSessionName] = useState("");
  const [scoringType, setScoringType] = useState<string | null>(null);
  const [teamScore, setTeamScore] = useState("");
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [guestName, setGuestName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback(
    (q: string) => {
      setSearchQuery(q);
      if (searchTimer.current) clearTimeout(searchTimer.current);
      if (q.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      searchTimer.current = setTimeout(async () => {
        try {
          const results = await api.profiles.search(accessToken, q.trim());
          setSearchResults(results);
        } catch {
          setSearchResults([]);
        }
      }, 300);
    },
    [accessToken],
  );

  function addContributor(user: UserSearchResult) {
    if (contributors.some((c) => c.user_id === String(user.user_id))) return;
    setContributors((prev) => [
      ...prev,
      {
        user_id: String(user.user_id),
        display_name:
          user.display_name ?? (user.email.split("@")[0] || user.email),
        role: "athlete",
      },
    ]);
    setSearchQuery("");
    setSearchResults([]);
  }

  function addGuest() {
    const name = guestName.trim();
    if (!name) return;
    setContributors((prev) => [
      ...prev,
      { guest_name: name, display_name: name, role: "athlete" },
    ]);
    setGuestName("");
  }

  function removeContributor(idx: number) {
    setContributors((prev) => prev.filter((_, i) => i !== idx));
  }

  function setRole(idx: number, role: Role) {
    setContributors((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, role } : c)),
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      // Parse team score for time-based types
      let teamScoreS: number | null = null;
      if (
        teamScore &&
        scoringType &&
        ["for_time", "relay", "slowest_finisher"].includes(scoringType)
      ) {
        const [mStr, sStr] = teamScore.split(":");
        const m = parseInt(mStr ?? "0", 10);
        const s = parseInt(sStr ?? "0", 10);
        if (!isNaN(m) && !isNaN(s)) teamScoreS = m * 60 + s;
      }
      let teamScoreReps: number | null = null;
      if (
        teamScore &&
        scoringType &&
        ["amrap", "total_reps"].includes(scoringType)
      ) {
        const n = parseInt(teamScore, 10);
        if (!isNaN(n)) teamScoreReps = n;
      }

      const session = await api.teamSessions.create(accessToken, {
        performed_at: performedAt,
        name: sessionName.trim() || null,
        scoring_type: scoringType,
        workout_id: workoutId,
        team_score: teamScore.trim() || null,
        team_score_s: teamScoreS,
        team_score_reps: teamScoreReps,
        participants: contributors.map((c) => ({
          user_id: c.user_id ?? null,
          guest_name: c.guest_name ?? null,
          role: c.role,
        })),
      });
      onCreated?.(session);
      onOpenChange(false);
      // Reset form
      setSessionName("");
      setScoringType(null);
      setTeamScore("");
      setContributors([]);
    } catch {
      setError("Failed to create team session. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const scoreLabel = scoringType
    ? SCORE_LABELS[scoringType] ?? "team score"
    : "team score";

  // Animation: respect prefers-reduced-motion
  const animationClass = prefersReduced ? "" : "motion-safe:animate-slideUp";
  void animationClass;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="bg-[#161b22] border-t border-[#30363d] max-h-[92vh] overflow-y-auto"
        showCloseButton={false}
      >
        {/* Grab handle */}
        <div className="flex justify-center pt-3 pb-1" aria-hidden>
          <div className="w-8 h-[4px] rounded-full bg-[#30363d]" />
        </div>

        <SheetHeader className="px-5 pt-2 pb-4">
          <SheetTitle className="font-mono text-[13px] text-[#8b949e] font-normal text-left">
            $ git merge
          </SheetTitle>
          <p className="font-semibold text-[15px] text-[#e6edf3] text-left mt-0.5">
            Log a team session
          </p>
        </SheetHeader>

        <div className="px-5 space-y-5 pb-6">
          {/* Session name */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#8b949e]">
              session name
            </label>
            <Input
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="e.g. Wednesday WOD"
              className="bg-[#0d1117] border-[#30363d] text-[#e6edf3] placeholder:text-[#8b949e] h-9 text-sm"
            />
          </div>

          {/* Scoring type */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-[#8b949e]">
              scoring type
            </label>
            <div className="flex flex-wrap gap-2">
              {SCORING_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setScoringType((prev) => (prev === value ? null : value))
                  }
                  className="text-xs font-mono px-3 py-1.5 rounded border transition-colors"
                  style={
                    scoringType === value
                      ? {
                          background: "rgba(88,166,255,0.15)",
                          borderColor: "rgba(88,166,255,0.4)",
                          color: "#58a6ff",
                        }
                      : {
                          background: "transparent",
                          borderColor: "#30363d",
                          color: "#8b949e",
                        }
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Contributors */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-[#8b949e]">
              contributors
            </label>

            {/* Search FitHub users */}
            <div className="relative">
              <Input
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by name or email…"
                className="bg-[#0d1117] border-[#30363d] text-[#e6edf3] placeholder:text-[#8b949e] h-9 text-sm"
              />
              {searchResults.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-[#1c2128] border border-[#30363d] rounded-lg overflow-hidden shadow-lg">
                  {searchResults.map((u) => (
                    <button
                      key={String(u.user_id)}
                      type="button"
                      onClick={() => addContributor(u)}
                      className="w-full text-left px-3 py-2 text-sm text-[#e6edf3] hover:bg-[#30363d] flex items-center gap-2 transition-colors"
                    >
                      <span className="w-6 h-6 rounded-full bg-[#58a6ff] flex items-center justify-center text-[10px] font-bold text-[#0d1117] shrink-0">
                        {(u.display_name ?? u.email).charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate">
                          {u.display_name ?? u.email.split("@")[0]}
                        </span>
                        <span className="block truncate text-xs text-[#8b949e]">
                          {u.email}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Add guest */}
            <div className="flex gap-2">
              <Input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addGuest();
                  }
                }}
                placeholder="Add guest name…"
                className="bg-[#0d1117] border-[#30363d] text-[#e6edf3] placeholder:text-[#8b949e] h-9 text-sm flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addGuest}
                disabled={!guestName.trim()}
                className="border-[#30363d] text-[#8b949e] hover:text-[#e6edf3] hover:border-[#58a6ff]/40 shrink-0"
              >
                + Guest
              </Button>
            </div>

            {/* Contributor chips */}
            {contributors.length > 0 && (
              <div className="space-y-2 mt-2">
                {contributors.map((c, idx) => {
                  const colors = ROLE_COLORS[c.role] ?? {
                    text: "#58a6ff",
                    border: "rgba(88,166,255,0.3)",
                    bg: "rgba(88,166,255,0.15)",
                  };
                  return (
                    <div
                      key={c.user_id ?? c.guest_name ?? idx}
                      className="flex items-center gap-2 flex-wrap"
                    >
                      <span className="w-6 h-6 rounded-full bg-[#30363d] flex items-center justify-center text-[10px] font-bold text-[#e6edf3] shrink-0">
                        {c.display_name.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-sm text-[#e6edf3] flex-1 min-w-0 truncate">
                        {c.display_name}
                        {!c.user_id && (
                          <span className="ml-1 text-[10px] text-[#8b949e] font-mono">
                            guest
                          </span>
                        )}
                      </span>
                      {/* Role selector */}
                      <div className="flex gap-1">
                        {ROLES.map((r) => (
                          <RoleBadge
                            key={r}
                            role={r}
                            selected={c.role === r}
                            onSelect={() => setRole(idx, r)}
                          />
                        ))}
                      </div>
                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => removeContributor(idx)}
                        aria-label={`Remove ${c.display_name}`}
                        className="text-[#8b949e] hover:text-[#ff7b72] text-xs ml-1 transition-colors"
                        style={{ color: colors.text }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Team score */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#8b949e]">
              {scoreLabel}
            </label>
            <Input
              value={teamScore}
              onChange={(e) => setTeamScore(e.target.value)}
              placeholder={
                scoringType === "for_time" ||
                scoringType === "relay" ||
                scoringType === "slowest_finisher"
                  ? "mm:ss"
                  : "optional"
              }
              className="bg-[#0d1117] border-[#30363d] text-[#e6edf3] placeholder:text-[#8b949e] h-9 text-sm font-mono"
            />
          </div>

          {error && <p className="text-xs text-[#ff7b72] font-mono">{error}</p>}

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 rounded-lg font-mono text-sm font-semibold transition-colors disabled:opacity-50"
            style={{
              background: "rgba(88,166,255,0.15)",
              border: "1px solid rgba(88,166,255,0.4)",
              color: "#58a6ff",
            }}
          >
            {submitting ? "Merging…" : "$ git merge"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
