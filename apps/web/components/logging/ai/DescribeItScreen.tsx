"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CreateResultBody,
  CreateWorkoutBody,
  Movement,
  ParseLogResponse,
  ResultType,
  SessionType,
  WorkoutFormat,
} from "@/lib/api";
import { ApiError, createApiClient } from "@/lib/api/client";
import { SESSION_LABELS, FORMAT_LABELS } from "@/lib/display";
import { MovementSearchSheet } from "@/components/logging/MovementSearchSheet";

interface ParsedEntry {
  id: string;
  parsedName: string;
  /** Resolved catalog movement, or null while unmatched. */
  matched: Movement | null;
  resultType: ResultType;
  reps: string;
  load: string;
  time: string;
  scaled: boolean;
}

interface Session {
  title: string;
  sessionType: SessionType | "";
  workoutFormat: WorkoutFormat | "";
  sessionRpe: string;
  duration: string;
}

const SESSION_TYPES = Object.keys(SESSION_LABELS) as SessionType[];
const FORMATS = Object.keys(FORMAT_LABELS) as WorkoutFormat[];

/**
 * AI natural-language logging — "Describe it" (01 §10.1). A single free-text bar
 * calls POST /coach/parse-log; the parsed session fields pre-fill an editable
 * block and each result renders as a confirmable card. The parser returns plain
 * movement-name strings and never resolves them, so each card is marked
 * "unmatched — tap to confirm" until the user picks a real catalog movement; the
 * workout can't be committed while any movement is unmatched. On commit the
 * matched entries POST as one workout (the parse is a fast pre-fill, not a
 * separate save path).
 */
export function DescribeItScreen({
  token,
  weightUnit,
}: {
  token: string;
  weightUnit: string;
}) {
  const router = useRouter();
  const client = useMemo(() => createApiClient(token), [token]);

  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState(false);
  const [stub, setStub] = useState(false);

  const [session, setSession] = useState<Session>({
    title: "",
    sessionType: "",
    workoutFormat: "",
    sessionRpe: "",
    duration: "",
  });
  const [entries, setEntries] = useState<ParsedEntry[]>([]);
  const [matchingId, setMatchingId] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);

  const unmatchedCount = entries.filter((e) => !e.matched).length;

  function applyParse(res: ParseLogResponse) {
    const p = res.parsed;
    setSession({
      title: p.title ?? "",
      sessionType: p.session_type ?? "",
      workoutFormat: p.workout_format ?? "",
      sessionRpe: p.session_rpe != null ? String(p.session_rpe) : "",
      duration: p.duration_s != null ? String(p.duration_s) : "",
    });
    setEntries(
      p.results.map((r) => ({
        id: crypto.randomUUID(),
        parsedName: r.movement_name,
        matched: null,
        resultType: r.result_type,
        reps: r.reps != null ? String(r.reps) : "",
        load: r.load_kg != null ? String(r.load_kg) : "",
        time: r.time_s != null ? String(r.time_s) : "",
        scaled: r.scaled,
      })),
    );
    setStub(res.stub);
    setParsed(true);
  }

  async function handleParse() {
    if (text.trim() === "" || parsing) return;
    setParsing(true);
    setError(null);
    try {
      const res = await client.coach.parseLog(text.trim());
      applyParse(res);
    } catch (err) {
      // No partial parse is applied — the form is left exactly as it was.
      if (err instanceof ApiError && err.status === 429) {
        setError("AI logging is busy — try again in a moment.");
      } else if (
        err instanceof ApiError &&
        (err.status === 402 || err.status === 403)
      ) {
        setError("AI coaching is temporarily unavailable.");
      } else {
        setError("Couldn't parse that — check your connection and try again.");
      }
    } finally {
      setParsing(false);
    }
  }

  function updateEntry(
    id: string,
    patch: Partial<ParsedEntry> | ((prev: ParsedEntry) => Partial<ParsedEntry>),
  ) {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, ...(typeof patch === "function" ? patch(e) : patch) }
          : e,
      ),
    );
  }

  async function handleCommit() {
    if (unmatchedCount > 0 || committing) return;
    setCommitting(true);
    setError(null);
    const results: CreateResultBody[] = entries
      .filter((e) => e.matched)
      .map((e, i) => buildResult(e, i));
    const body: CreateWorkoutBody = {
      performed_at: localMidnightIso(),
      title: session.title.trim() || null,
      session_type: session.sessionType || null,
      workout_format: session.workoutFormat || null,
      session_rpe:
        session.sessionRpe.trim() === "" ? null : Number(session.sessionRpe),
      duration_s:
        session.duration.trim() === "" ? null : Number(session.duration),
      is_tag: false,
      results,
    };
    try {
      const workout = await client.workouts.create(body);
      router.push(`/workouts/${workout.short_hash}`);
    } catch {
      setCommitting(false);
      setError("Couldn't save the workout. Please try again.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 py-4">
      <h1
        className="mb-1 font-sans text-[18px] font-semibold"
        style={{ color: "var(--text)" }}
      >
        Describe it
      </h1>
      <p
        className="mb-3 font-sans text-[13px]"
        style={{ color: "var(--muted)" }}
      >
        Type your workout in a sentence or two and let AI break it into
        structured results.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder="e.g. 3×5 back squat 100kg, then 3 rounds Fran, 2k row in 7:42"
        className="w-full rounded-[8px] px-3 py-2 font-sans text-[14px]"
        style={{
          background: "var(--surface)",
          color: "var(--text)",
          border: "1px solid var(--border)",
        }}
      />
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={handleParse}
          disabled={parsing || text.trim() === ""}
          className="rounded-[8px] px-4 py-2 font-sans text-[13px] font-semibold"
          style={{
            background: "var(--accent)",
            color: "var(--bg)",
            opacity: parsing || text.trim() === "" ? 0.6 : 1,
          }}
        >
          {parsing ? "Parsing…" : "Parse"}
        </button>
      </div>

      {error && (
        <p
          className="mt-3 font-sans text-[13px]"
          style={{ color: "var(--red)" }}
        >
          {error}
        </p>
      )}

      {parsed && (
        <div className="mt-5 flex flex-col gap-4">
          {stub && (
            <p
              className="rounded-[8px] px-3 py-2 font-sans text-[12px]"
              style={{
                background: "var(--surface)",
                color: "var(--muted)",
                border: "1px solid var(--border)",
              }}
            >
              Demo mode: this is a canned example, not a live parse.
            </p>
          )}

          <SessionFields session={session} onChange={setSession} />

          <div className="flex flex-col gap-3">
            {entries.map((e) => (
              <ParsedCard
                key={e.id}
                entry={e}
                weightUnit={weightUnit}
                onMatch={() => setMatchingId(e.id)}
                onChange={(patch) => updateEntry(e.id, patch)}
              />
            ))}
            {entries.length === 0 && (
              <p
                className="font-sans text-[13px]"
                style={{ color: "var(--muted)" }}
              >
                No movements were parsed. Edit the text and parse again.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <span
              className="font-sans text-[12px]"
              style={{
                color: unmatchedCount > 0 ? "var(--amber)" : "var(--muted)",
              }}
            >
              {unmatchedCount > 0
                ? `${unmatchedCount} movement${
                    unmatchedCount === 1 ? " needs" : "s need"
                  } confirming`
                : "All movements confirmed"}
            </span>
            <button
              type="button"
              onClick={handleCommit}
              disabled={
                unmatchedCount > 0 || committing || entries.length === 0
              }
              className="rounded-[8px] px-4 py-2 font-sans text-[13px] font-semibold"
              style={{
                background: "var(--accent)",
                color: "var(--bg)",
                opacity:
                  unmatchedCount > 0 || committing || entries.length === 0
                    ? 0.5
                    : 1,
              }}
            >
              {committing ? "Committing…" : "Commit"}
            </button>
          </div>
        </div>
      )}

      {matchingId && (
        <MovementSearchSheet
          token={token}
          onPick={(m) => {
            // Keep the parser's result_type (and its already-entered values);
            // only adopt the movement's default when the parser left it at the
            // ambiguous "reps" fallback, so a parsed time/weight isn't orphaned.
            updateEntry(matchingId, (prev) => ({
              matched: m,
              resultType:
                prev.resultType === "reps" && m.default_result_type
                  ? m.default_result_type
                  : prev.resultType,
            }));
            setMatchingId(null);
          }}
          onClose={() => setMatchingId(null)}
        />
      )}
    </div>
  );
}

function ParsedCard({
  entry,
  weightUnit,
  onMatch,
  onChange,
}: {
  entry: ParsedEntry;
  weightUnit: string;
  onMatch: () => void;
  onChange: (patch: Partial<ParsedEntry>) => void;
}) {
  const matched = entry.matched != null;
  return (
    <div
      className="rounded-[10px] p-3"
      style={{
        background: "var(--surface)",
        border: `1px solid ${matched ? "var(--border)" : "var(--amber)"}`,
      }}
    >
      <button
        type="button"
        onClick={onMatch}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span
          className="font-sans text-[14px] font-medium"
          style={{ color: "var(--text)" }}
        >
          {matched ? entry.matched!.name : entry.parsedName}
        </span>
        <span
          className="shrink-0 rounded-[4px] px-1.5 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide"
          style={
            matched
              ? { color: "var(--green)", border: "1px solid var(--green)" }
              : { color: "var(--amber)", border: "1px solid var(--amber)" }
          }
        >
          {matched ? "Matched" : "Tap to confirm"}
        </span>
      </button>

      <div className="mt-2 flex flex-wrap gap-2">
        {(entry.resultType === "weight" || entry.resultType === "reps") && (
          <ValueInput
            label="reps"
            value={entry.reps}
            onChange={(v) => onChange({ reps: v })}
          />
        )}
        {entry.resultType === "weight" && (
          <ValueInput
            label={weightUnit}
            value={entry.load}
            onChange={(v) => onChange({ load: v })}
          />
        )}
        {entry.resultType === "time" && (
          <ValueInput
            label="sec"
            value={entry.time}
            onChange={(v) => onChange({ time: v })}
          />
        )}
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={entry.scaled}
            onChange={(e) => onChange({ scaled: e.target.checked })}
          />
          <span
            className="font-sans text-[12px]"
            style={{ color: "var(--muted)" }}
          >
            Scaled
          </span>
        </label>
      </div>
    </div>
  );
}

function ValueInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-1">
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-16 rounded-[6px] px-2 py-1 font-mono text-[13px]"
        style={{
          background: "var(--bg)",
          color: "var(--text)",
          border: "1px solid var(--border)",
        }}
      />
      <span className="font-sans text-[11px]" style={{ color: "var(--muted)" }}>
        {label}
      </span>
    </label>
  );
}

function SessionFields({
  session,
  onChange,
}: {
  session: Session;
  onChange: (s: Session) => void;
}) {
  const inputClass = "w-full rounded-[6px] px-2 py-1.5 font-sans text-[13px]";
  const inputStyle = {
    background: "var(--bg)",
    color: "var(--text)",
    border: "1px solid var(--border)",
  } as const;
  return (
    <div className="flex flex-col gap-2">
      <input
        value={session.title}
        onChange={(e) => onChange({ ...session, title: e.target.value })}
        placeholder="Session title"
        aria-label="Session title"
        className={inputClass}
        style={inputStyle}
      />
      <div className="flex gap-2">
        <select
          value={session.sessionType}
          onChange={(e) =>
            onChange({
              ...session,
              sessionType: e.target.value as SessionType | "",
            })
          }
          aria-label="Session type"
          className={inputClass}
          style={inputStyle}
        >
          <option value="">Session type</option>
          {SESSION_TYPES.map((t) => (
            <option key={t} value={t}>
              {SESSION_LABELS[t]}
            </option>
          ))}
        </select>
        <select
          value={session.workoutFormat}
          onChange={(e) =>
            onChange({
              ...session,
              workoutFormat: e.target.value as WorkoutFormat | "",
            })
          }
          aria-label="Workout format"
          className={inputClass}
          style={inputStyle}
        >
          <option value="">Format</option>
          {FORMATS.map((f) => (
            <option key={f} value={f}>
              {FORMAT_LABELS[f]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function buildResult(entry: ParsedEntry, index: number): CreateResultBody {
  const num = (v: string): number | null => {
    const t = v.trim();
    if (t === "") return null;
    const n = Number(t);
    return Number.isNaN(n) ? null : n;
  };
  const base: CreateResultBody = {
    movement_id: entry.matched!.id,
    result_type: entry.resultType,
    order_index: index * 100,
    set_index: 0,
    scaled: entry.scaled,
    is_pr: false,
    pace_distance_m: 500,
  };
  switch (entry.resultType) {
    case "weight":
      return { ...base, load_kg: num(entry.load), reps: num(entry.reps) };
    case "reps":
      return { ...base, reps: num(entry.reps) };
    case "time":
      return { ...base, time_s: num(entry.time) };
    default:
      return base;
  }
}

/**
 * ISO instant for local midnight of today. `performed_at` is a genuine
 * `timestamptz`, so this must carry an explicit offset (via `toISOString`) —
 * a naive "no tz suffix" string would be read back as UTC midnight by the
 * backend and shift the day in negative-offset zones.
 */
function localMidnightIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
}
