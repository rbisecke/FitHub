"use client";

import { useId, useMemo, useState } from "react";
import { normalizeGuestName } from "@fithub/shared";
import { api } from "@/lib/api/client";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { SheetOverlay } from "@/components/logging/SheetOverlay";
import { AvatarMonogram } from "@/components/shared/avatar-monogram";
import { ParticipantPicker, type StagedParticipant } from "./ParticipantPicker";
import { SCORING_TYPE_LABELS } from "@/lib/display";
import { inputStyle } from "./formStyles";
import { parseTimeInput, timeTextToSeconds, formatTime } from "@/lib/time";
import { teamScoreHeaderLabel } from "@/lib/team-sessions/leaderboard";
import type { ScoringType, TeamSession, TeamSessionStatus } from "@/lib/api";

const SCORING_TYPES = Object.keys(SCORING_TYPE_LABELS) as ScoringType[];
const TIME_TYPES = new Set<ScoringType>([
  "for_time",
  "relay",
  "slowest_finisher",
]);
const REPS_TYPES = new Set<ScoringType>(["amrap", "total_reps"]);

function toLocalDatetimeInputValue(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${d}T${h}:${mi}`;
}

function localDatetimeInputToIso(value: string): string {
  // value is "YYYY-MM-DDTHH:mm" from the browser's local-time picker — decompose
  // into local parts rather than trusting Date parsing of the raw string.
  const [datePart, timePart] = value.split("T");
  const [y, mo, d] = (datePart ?? "").split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const [h, mi] = (timePart ?? "00:00").split(":").map(Number) as [
    number,
    number,
  ];
  return new Date(y, mo - 1, d, h, mi).toISOString();
}

export interface TeamSessionFormProps {
  accessToken: string;
  mode: "create" | "edit";
  /** Create-only: pre-attaches the creator's just-logged workout (§2 entry context 1). */
  seedWorkout?: { workoutId: string; performedAt: string } | null;
  /** Edit-only: the session being edited, for pre-fill (§5). */
  existing?: TeamSession;
  onClose: () => void;
  onCreated?: (session: TeamSession) => void;
  onSaved?: (session: TeamSession) => void;
  onDeleted?: () => void;
}

/**
 * Create / edit team session form (06 §2, §5). Light theme (F1 — seated data
 * entry), responsive `Sheet`/`Dialog` via the shared `SheetOverlay` (bottom
 * sheet <768px, centered dialog ≥768px — same content both, per §2). Reused
 * by both entry points: the team-session list's "+ New session" action and
 * `WorkoutCard`'s "record with a partner" flow (seeded context).
 */
export function TeamSessionForm({
  accessToken,
  mode,
  seedWorkout,
  existing,
  onClose,
  onCreated,
  onSaved,
  onDeleted,
}: TeamSessionFormProps) {
  const [name, setName] = useState(existing?.name ?? "");
  const [performedAt, setPerformedAt] = useState(() => {
    if (existing)
      return toLocalDatetimeInputValue(new Date(existing.performed_at));
    if (seedWorkout)
      return toLocalDatetimeInputValue(new Date(seedWorkout.performedAt));
    return toLocalDatetimeInputValue(new Date());
  });
  const [scoringType, setScoringType] = useState<ScoringType | null>(
    existing?.scoring_type ?? null,
  );
  const [status, setStatus] = useState<TeamSessionStatus>(
    existing?.status ?? "active",
  );
  const [teamSize, setTeamSize] = useState(existing?.team_size ?? 2);
  const [teamScore, setTeamScore] = useState(existing?.team_score ?? "");
  const [teamScoreTime, setTeamScoreTime] = useState(
    existing?.team_score_s != null ? formatTime(existing.team_score_s) : "",
  );
  const [teamScoreReps, setTeamScoreReps] = useState(
    existing?.team_score_reps != null ? String(existing.team_score_reps) : "",
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");
  // Participant management (add/remove/role) is a separate concern (06 §4)
  // with its own dedicated endpoints, owned by the session-detail screen —
  // this form only ever stages participants at CREATE time. Edit mode
  // (§5) covers session-level fields only (name/scoring/score/notes/status),
  // so the participants list stays empty and hidden in edit mode rather than
  // rendering controls that `handleSubmit`'s PATCH call would silently drop.
  const [participants, setParticipants] = useState<StagedParticipant[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTimeType = scoringType != null && TIME_TYPES.has(scoringType);
  const isRepsType = scoringType != null && REPS_TYPES.has(scoringType);
  const timeRequired = isTimeType && teamScore.trim().length > 0;

  const existingUserIds = useMemo(
    () => new Set(participants.filter((p) => p.user_id).map((p) => p.user_id!)),
    [participants],
  );
  const existingGuestNames = useMemo(
    () =>
      new Set(
        participants
          .filter((p) => p.guest_name)
          .map((p) => normalizeGuestName(p.guest_name!)),
      ),
    [participants],
  );

  /** Clears whichever structured score field no longer applies when the user
   * switches scoring type — handled at the point of change (not an effect),
   * since it's a response to this specific user action, not a sync with an
   * external system. */
  function selectScoringType(next: ScoringType | null) {
    setScoringType(next);
    if (next == null || !TIME_TYPES.has(next)) setTeamScoreTime("");
    if (next == null || !REPS_TYPES.has(next)) setTeamScoreReps("");
  }

  function removeParticipant(key: string) {
    setParticipants((prev) => prev.filter((p) => p.key !== key));
  }

  async function handleSubmit() {
    setError(null);
    if (
      timeRequired &&
      timeTextToSeconds(parseTimeInput(teamScoreTime)) == null
    ) {
      setError("Enter a time for this scoring type before saving.");
      return;
    }
    setSubmitting(true);
    try {
      const teamScoreS = isTimeType
        ? timeTextToSeconds(parseTimeInput(teamScoreTime))
        : null;
      const teamScoreReps_ = isRepsType
        ? (() => {
            const n = parseInt(teamScoreReps, 10);
            return Number.isNaN(n) ? null : n;
          })()
        : null;

      if (mode === "create") {
        const session = await api.teamSessions.create(accessToken, {
          performed_at: localDatetimeInputToIso(performedAt),
          name: name.trim() || null,
          team_size: teamSize,
          scoring_type: scoringType,
          status,
          team_score: teamScore.trim() || null,
          team_score_s: teamScoreS,
          team_score_reps: teamScoreReps_,
          notes: notes.trim() || null,
          workout_id: seedWorkout?.workoutId ?? null,
          participants: participants.map((p) => ({
            user_id: p.user_id,
            guest_name: p.guest_name,
            role: p.role.trim() || null,
          })),
        });
        onCreated?.(session);
      } else if (existing) {
        const session = await api.teamSessions.patch(accessToken, existing.id, {
          name: name.trim() || null,
          scoring_type: scoringType,
          team_score: teamScore.trim() || null,
          team_score_s: teamScoreS,
          team_score_reps: teamScoreReps_,
          notes: notes.trim() || null,
          status,
        });
        onSaved?.(session);
      }
    } catch {
      setError(
        mode === "create"
          ? "Couldn't create this session. Please try again."
          : "Couldn't save changes. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!existing) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.teamSessions.delete(accessToken, existing.id);
      onDeleted?.();
    } catch {
      setError("Couldn't delete this session. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <ForcedTheme theme="light">
      <SheetOverlay
        title={mode === "create" ? "New team session" : "Edit team session"}
        onClose={onClose}
      >
        <div className="flex flex-col gap-5">
          {seedWorkout && mode === "create" && (
            <div
              className="flex items-center gap-2 rounded-[8px] px-3 py-2 font-sans text-[13px]"
              style={{ background: "var(--green)", color: "var(--bg)" }}
            >
              Your result is attached
            </div>
          )}

          <Field label="Session name (optional)">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              placeholder="e.g. Wednesday WOD"
              aria-label="Session name"
              className="w-full rounded-[8px] px-3 py-2 font-sans text-[14px]"
              style={inputStyle}
            />
          </Field>

          <Field label="Date & time">
            {mode === "create" ? (
              <input
                type="datetime-local"
                value={performedAt}
                onChange={(e) => setPerformedAt(e.target.value)}
                aria-label="Date & time"
                className="w-full rounded-[8px] px-3 py-2 font-mono text-[14px] tabular-nums"
                style={inputStyle}
              />
            ) : (
              // PatchTeamSessionRequest has no performed_at field — the API
              // doesn't support editing it, so this renders read-only rather
              // than as a live input a "Save" would silently discard.
              <p
                className="w-full rounded-[8px] px-3 py-2 font-mono text-[14px] tabular-nums"
                style={inputStyle}
              >
                {performedAt.replace("T", " ")}
              </p>
            )}
          </Field>

          <Field label="Scoring type">
            <div className="flex flex-wrap gap-2">
              {SCORING_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    selectScoringType(scoringType === t ? null : t)
                  }
                  className="rounded-full px-3 py-1.5 font-mono text-[12px] transition-colors"
                  style={
                    scoringType === t
                      ? { background: "var(--accent)", color: "var(--bg)" }
                      : {
                          background: "var(--surface)",
                          color: "var(--muted)",
                          border: "1px solid var(--border)",
                        }
                  }
                >
                  {SCORING_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </Field>

          {mode === "create" && (
            <Field label="Status">
              <div className="flex gap-2">
                {(["active", "completed"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className="flex-1 rounded-[8px] px-3 py-2 font-sans text-[13px] font-medium transition-colors"
                    style={
                      status === s
                        ? { background: "var(--accent)", color: "var(--bg)" }
                        : {
                            background: "var(--surface)",
                            color: "var(--muted)",
                            border: "1px solid var(--border)",
                          }
                    }
                  >
                    {s === "active" ? "Live" : "Completed"}
                  </button>
                ))}
              </div>
            </Field>
          )}

          <Field
            label={teamScoreHeaderLabel(scoringType) ?? "Team score"}
            hint="The shared number for the whole session — each person's own result comes from their linked workout below."
          >
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span
                  className="font-sans text-[10px] uppercase tracking-wide"
                  style={{ color: "var(--muted)" }}
                >
                  Display text (optional)
                </span>
                <input
                  value={teamScore}
                  onChange={(e) => setTeamScore(e.target.value)}
                  maxLength={50}
                  placeholder={`e.g. "18:32 Rx"`}
                  aria-label="Team score display text"
                  className="w-full rounded-[8px] px-3 py-2 font-mono text-[14px]"
                  style={inputStyle}
                />
              </div>
              {isTimeType && (
                <div className="flex flex-col gap-1">
                  <span
                    className="font-sans text-[10px] uppercase tracking-wide"
                    style={{ color: "var(--muted)" }}
                  >
                    Exact time (mm:ss)
                  </span>
                  <input
                    value={teamScoreTime}
                    onChange={(e) =>
                      setTeamScoreTime(parseTimeInput(e.target.value))
                    }
                    placeholder="mm:ss"
                    aria-label="Exact team time (mm:ss)"
                    className="w-full rounded-[8px] px-3 py-2 font-mono text-[14px] tabular-nums"
                    style={inputStyle}
                  />
                  {timeRequired && timeTextToSeconds(teamScoreTime) == null && (
                    <p
                      className="font-sans text-[12px]"
                      style={{ color: "var(--amber)" }}
                    >
                      Required for this scoring type
                    </p>
                  )}
                </div>
              )}
              {isRepsType && (
                <div className="flex flex-col gap-1">
                  <span
                    className="font-sans text-[10px] uppercase tracking-wide"
                    style={{ color: "var(--muted)" }}
                  >
                    Exact reps
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={teamScoreReps}
                    onChange={(e) => setTeamScoreReps(e.target.value)}
                    placeholder="Total reps"
                    aria-label="Exact total reps"
                    className="w-full rounded-[8px] px-3 py-2 font-mono text-[14px] tabular-nums"
                    style={inputStyle}
                  />
                </div>
              )}
            </div>
          </Field>

          {mode === "create" && (
            <Field label="Target size (informational)">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTeamSize((n) => Math.max(2, n - 1))}
                  className="flex size-8 items-center justify-center rounded-[8px] font-mono text-[16px]"
                  style={{ background: "var(--surface)", color: "var(--text)" }}
                  aria-label="Decrease target size"
                >
                  −
                </button>
                <span
                  className="w-8 text-center font-mono text-[15px] tabular-nums"
                  style={{ color: "var(--text)" }}
                >
                  {teamSize}
                </span>
                <button
                  type="button"
                  onClick={() => setTeamSize((n) => Math.min(20, n + 1))}
                  className="flex size-8 items-center justify-center rounded-[8px] font-mono text-[16px]"
                  style={{ background: "var(--surface)", color: "var(--text)" }}
                  aria-label="Increase target size"
                >
                  +
                </button>
              </div>
            </Field>
          )}

          {mode === "create" && (
            <Field label="Participants">
              <div className="flex flex-col gap-2">
                <div
                  className="flex items-center gap-2 rounded-[8px] px-2.5 py-2"
                  style={{ background: "var(--surface)" }}
                >
                  <AvatarMonogram name="You" size="sm" />
                  <span
                    className="font-sans text-[13px]"
                    style={{ color: "var(--text)" }}
                  >
                    You
                  </span>
                  <span
                    className="ml-auto font-sans text-[11px]"
                    style={{ color: "var(--muted)" }}
                  >
                    Creator
                  </span>
                </div>
                {participants.map((p) => (
                  <div
                    key={p.key}
                    className="flex items-center gap-2 rounded-[8px] px-2.5 py-2"
                    style={{ background: "var(--surface)" }}
                  >
                    <AvatarMonogram
                      name={p.display_name}
                      seed={p.user_id ?? p.guest_name ?? p.display_name}
                      isGuest={!p.user_id}
                      size="sm"
                    />
                    <span
                      className="min-w-0 flex-1 truncate font-sans text-[13px]"
                      style={{ color: "var(--text)" }}
                    >
                      {p.display_name}
                      {!p.user_id && (
                        <span
                          className="ml-1.5 font-mono text-[10px]"
                          style={{ color: "var(--muted)" }}
                        >
                          guest
                        </span>
                      )}
                    </span>
                    <input
                      value={p.role}
                      onChange={(e) =>
                        setParticipants((prev) =>
                          prev.map((x) =>
                            x.key === p.key
                              ? { ...x, role: e.target.value }
                              : x,
                          ),
                        )
                      }
                      placeholder="role"
                      maxLength={100}
                      aria-label={`Role for ${p.display_name}`}
                      className="w-20 rounded-[6px] px-1.5 py-1 font-mono text-[11px]"
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => removeParticipant(p.key)}
                      aria-label={`Remove ${p.display_name}`}
                      className="font-sans text-[16px] leading-none"
                      style={{ color: "var(--muted)" }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="rounded-[8px] px-3 py-2 font-sans text-[13px] font-medium"
                  style={{
                    background: "transparent",
                    border: "1px dashed var(--border)",
                    color: "var(--accent)",
                  }}
                >
                  + Add participant
                </button>
              </div>
            </Field>
          )}

          <Field label="Notes (optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Anything worth remembering about this session…"
              aria-label="Notes"
              className="w-full rounded-[8px] px-3 py-2 font-sans text-[13px]"
              style={inputStyle}
            />
          </Field>

          {error && (
            <p
              className="font-sans text-[13px]"
              style={{ color: "var(--red)" }}
            >
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="w-full rounded-[8px] py-3 font-sans text-[14px] font-semibold transition-colors disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--bg)" }}
          >
            {submitting
              ? "Saving…"
              : mode === "create"
                ? "Create session"
                : "Save changes"}
          </button>

          {mode === "edit" && existing && (
            <button
              type="button"
              onClick={() => {
                if (confirmingDelete) void handleDelete();
                else setConfirmingDelete(true);
              }}
              disabled={submitting}
              className="w-full rounded-[8px] py-2.5 font-sans text-[13px] font-semibold transition-colors disabled:opacity-50"
              style={{
                background: confirmingDelete ? "var(--red)" : "transparent",
                color: confirmingDelete ? "var(--bg)" : "var(--red)",
                border: confirmingDelete ? "none" : "1px solid var(--red)",
              }}
            >
              {confirmingDelete ? "Confirm delete session" : "Delete session"}
            </button>
          )}
        </div>
      </SheetOverlay>

      {pickerOpen && (
        <ParticipantPicker
          accessToken={accessToken}
          existingUserIds={existingUserIds}
          existingGuestNames={existingGuestNames}
          onAdd={(p) => {
            setParticipants((prev) => [...prev, p]);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </ForcedTheme>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  // Children here range from a single native input to a row of buttons or a
  // whole nested picker component, so a <label htmlFor>/id pairing can't be
  // wired generically at this shared wrapper. Group semantics (role="group"
  // + aria-labelledby) associate the visible label with whatever's inside
  // regardless of shape, matching the pattern already used for the RPE and
  // training-experience button groups elsewhere in the app.
  const labelId = useId();
  return (
    <div
      className="flex flex-col gap-1.5"
      role="group"
      aria-labelledby={labelId}
    >
      <span
        id={labelId}
        className="font-sans text-[11px] font-medium uppercase tracking-wide"
        style={{ color: "var(--muted)" }}
      >
        {label}
      </span>
      {children}
      {hint && (
        <p className="font-sans text-[12px]" style={{ color: "var(--muted)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}
