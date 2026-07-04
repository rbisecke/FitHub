"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api/client";
import type { TeamSession, TeamSessionParticipant } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

const ROLE_COLORS: Record<string, string> = {
  rx: "#4ADE80",
  scaled: "#FFC83D",
  coach: "#8b5cf6",
  athlete: "#58a6ff",
};

function formatTeamScore(ts: TeamSession): string {
  if (ts.team_score_s != null) {
    const m = Math.floor(ts.team_score_s / 60);
    const s = ts.team_score_s % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  if (ts.team_score_reps != null) return `${ts.team_score_reps} reps`;
  if (ts.team_score) return ts.team_score;
  return "";
}

function teamScoreLabel(scoringType: string | null): string {
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

function ScoringTypeBadge({ type }: { type: string | null }) {
  if (!type) return null;
  const labels: Record<string, string> = {
    for_time: "For Time",
    amrap: "AMRAP",
    max_load: "Max Load",
    total_reps: "Total Reps",
    relay: "Relay",
    slowest_finisher: "Slowest Finisher",
  };
  return (
    <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-[--border] text-[--muted]">
      {labels[type] ?? type}
    </span>
  );
}

function ParticipantRow({
  participant,
  isCreator,
  currentUserId,
  onLeave,
}: {
  participant: TeamSessionParticipant;
  isCreator: boolean;
  currentUserId: string;
  onLeave: (participantId: string) => void;
}) {
  const roleColor = ROLE_COLORS[participant.role ?? "athlete"] ?? "#58a6ff";
  const name = participant.display_name ?? participant.guest_name ?? "Unknown";
  const initials = name.charAt(0).toUpperCase();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const isSelf = participant.user_id === currentUserId;

  return (
    <div className="flex items-center gap-3 py-2 border-b border-[--border] last:border-0">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold"
        style={{ background: roleColor + "22", color: roleColor }}
      >
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        <span className="text-sm text-[--text]">{name}</span>
        {participant.guest_name && (
          <span className="ml-1 font-mono text-[10px] text-[--muted]">
            (guest)
          </span>
        )}
      </div>

      {participant.role && (
        <span
          className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm flex-shrink-0"
          style={{
            color: roleColor,
            background: roleColor + "26",
            borderLeft: `2px solid ${roleColor}`,
          }}
        >
          {participant.role}
        </span>
      )}

      <span className="font-mono text-xs text-[--muted] flex-shrink-0">
        {participant.workout_id ? "linked" : "pending"}
      </span>

      {isSelf && !isCreator && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {confirmLeave ? (
            <>
              <button
                onClick={() => onLeave(participant.user_id!)}
                className="text-[10px] font-mono text-[--red] border border-[--red]/40 px-2 py-0.5 rounded transition-opacity duration-150"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmLeave(false)}
                className="text-[10px] font-mono text-[--muted] px-1 py-0.5"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmLeave(true)}
              className="text-[10px] font-mono text-[--muted] hover:text-[--red] transition-colors"
            >
              leave
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function TeamSessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [session, setSession] = useState<TeamSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingScore, setEditingScore] = useState(false);
  const [scoreInput, setScoreInput] = useState("");
  const [savingScore, setSavingScore] = useState(false);
  const scoreInputRef = useRef<HTMLInputElement>(null);

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesInput, setNotesInput] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/login");
        return;
      }
      setToken(data.session.access_token);
      setUserId(data.session.user.id);
    });
  }, [router]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api.teamSessions
      .get(token, id)
      .then((ts) => {
        setSession(ts);
        setScoreInput(formatTeamScore(ts));
        setNotesInput(ts.notes ?? "");
      })
      .catch(() => setError("Team session not found."))
      .finally(() => setLoading(false));
  }, [token, id]);

  const isCreator = session?.created_by === userId;

  async function saveScore() {
    if (!token || !session) return;
    setSavingScore(true);
    try {
      const updated = await api.teamSessions.patch(token, session.id, {
        team_score: scoreInput || null,
      });
      setSession(updated);
      setScoreInput(formatTeamScore(updated));
      setEditingScore(false);
    } catch {
      // ignore
    } finally {
      setSavingScore(false);
    }
  }

  async function saveNotes() {
    if (!token || !session) return;
    try {
      const updated = await api.teamSessions.patch(token, session.id, {
        notes: notesInput || null,
      });
      setSession(updated);
      setEditingNotes(false);
    } catch {
      // ignore
    }
  }

  async function leaveSession(participantUserId: string) {
    if (!token || !session) return;
    try {
      await api.teamSessions.removeParticipant(
        token,
        session.id,
        participantUserId,
      );
      router.replace("/history");
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-8 max-w-2xl mx-auto">
        <div className="font-mono text-xs text-[--muted]">
          Loading team session…
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="px-4 py-8 max-w-2xl mx-auto">
        <p className="text-sm text-[--muted]">
          {error ?? "Team session not found."}
        </p>
        <Link
          href="/history"
          className="text-xs text-[--blue] hover:underline font-mono mt-2 block"
        >
          ← back to history
        </Link>
      </div>
    );
  }

  const dateStr = session.performed_at.slice(0, 10);
  const [y, mo, d] = dateStr.split("-").map(Number) as [number, number, number];
  const dateLabel = new Date(y, mo - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const teamScoreDisplay = formatTeamScore(session);
  const hasTeamScore = !!teamScoreDisplay;

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
      <Link
        href="/history"
        className="text-xs font-mono text-[--muted] hover:text-[--blue] transition-colors"
      >
        ← back to history
      </Link>

      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="font-semibold text-[--text]">
            {session.name ?? (
              <span className="text-[--muted] italic">unnamed session</span>
            )}
          </h1>
          <ScoringTypeBadge
            type={(session.scoring_type as string | null) ?? null}
          />
        </div>
        <p className="font-mono text-xs text-[--muted]">{dateLabel}</p>
      </div>

      <div className="rounded-lg border border-[--border] bg-[--surface] p-4">
        <p className="font-mono text-[10px] text-[--muted] uppercase tracking-wider mb-2">
          {teamScoreLabel((session.scoring_type as string | null) ?? null)}
        </p>
        {editingScore ? (
          <div className="flex items-center gap-2">
            <input
              ref={scoreInputRef}
              value={scoreInput}
              onChange={(e) => setScoreInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveScore();
                if (e.key === "Escape") {
                  setEditingScore(false);
                  setScoreInput(formatTeamScore(session));
                }
              }}
              onBlur={saveScore}
              className="font-mono text-2xl text-[--blue] bg-transparent border-b border-[--blue]/50 outline-none w-40"
              placeholder="e.g. 18:42"
              autoFocus
              disabled={savingScore}
            />
          </div>
        ) : (
          <div
            className={`font-mono text-2xl ${
              hasTeamScore ? "text-[--blue]" : "text-[--muted] italic text-base"
            } ${
              isCreator
                ? "cursor-pointer hover:opacity-70 transition-opacity"
                : ""
            }`}
            onClick={() => {
              if (isCreator) {
                setEditingScore(true);
                setTimeout(() => scoreInputRef.current?.focus(), 50);
              }
            }}
            title={isCreator ? "Click to edit" : undefined}
          >
            {hasTeamScore ? teamScoreDisplay : "no score recorded"}
          </div>
        )}
        {isCreator && !editingScore && (
          <p className="font-mono text-[10px] text-[--muted] mt-1">
            click to edit
          </p>
        )}
      </div>

      <div>
        <p className="font-mono text-[10px] text-[--muted] uppercase tracking-wider mb-3">
          contributors
        </p>
        <div className="rounded-lg border border-[--border] bg-[--surface] px-4 divide-y divide-[--border]">
          {(session.participants ?? []).map((p) => (
            <ParticipantRow
              key={p.id}
              participant={p}
              isCreator={isCreator}
              currentUserId={userId ?? ""}
              onLeave={leaveSession}
            />
          ))}
          {(session.participants ?? []).length === 0 && (
            <p className="py-3 text-xs text-[--muted] font-mono">
              No contributors yet.
            </p>
          )}
        </div>
      </div>

      <div>
        <p className="font-mono text-[10px] text-[--muted] uppercase tracking-wider mb-2">
          session notes
        </p>
        {isCreator ? (
          editingNotes ? (
            <textarea
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              onBlur={saveNotes}
              className="w-full bg-[--surface] border border-[--border] rounded-lg px-3 py-2 text-sm text-[--text] font-mono resize-none outline-none focus:border-[--blue]/50 transition-colors"
              rows={3}
              placeholder="Add session notes…"
              autoFocus
            />
          ) : (
            <div
              onClick={() => setEditingNotes(true)}
              className="text-sm text-[--text] italic border-l-2 border-[--border] pl-3 cursor-pointer hover:border-[--blue]/50 transition-colors min-h-[2rem]"
            >
              {session.notes ?? (
                <span className="text-[--muted]">Add session notes…</span>
              )}
            </div>
          )
        ) : (
          session.notes && (
            <p className="text-sm text-[--text] italic border-l-2 border-[--border] pl-3">
              {session.notes}
            </p>
          )
        )}
      </div>
    </div>
  );
}
