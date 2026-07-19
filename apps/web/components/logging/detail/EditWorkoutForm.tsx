"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionType, WorkoutFormat, Workout } from "@/lib/api";
import { ApiError, createApiClient } from "@/lib/api/client";
import { SESSION_LABELS, FORMAT_LABELS } from "@/lib/display";
import { formatTime } from "@/lib/time";
import {
  parseFlexibleTime,
  normalizeTimeInput,
  toKg,
  localDateKey,
  formatResultValue,
  type DisplayUnits,
} from "@/lib/units";

const SESSION_TYPES = Object.keys(SESSION_LABELS) as SessionType[];
const FORMATS = Object.keys(FORMAT_LABELS) as WorkoutFormat[];

/**
 * Edit a past workout — session-level fields ONLY (01 §7). The PATCH model has
 * no `results` field: result edits are silently discarded by the API, so this
 * form deliberately shows result rows READ-ONLY (locked) with an explanatory
 * note, correcting the real silent-drop bug. Light-themed like the whole domain.
 */
export function EditWorkoutForm({
  workout,
  units,
  token,
}: {
  workout: Workout;
  units: DisplayUnits;
  token: string;
}) {
  const router = useRouter();
  const client = useMemo(() => createApiClient(token), [token]);

  const [title, setTitle] = useState(workout.title ?? "");
  const [performedAt, setPerformedAt] = useState(
    localDateKey(workout.performed_at),
  );
  const [sessionType, setSessionType] = useState<SessionType | "">(
    workout.session_type ?? "",
  );
  const [format, setFormat] = useState<WorkoutFormat | "">(
    workout.workout_format ?? "",
  );
  const [sessionRpe, setSessionRpe] = useState(
    workout.session_rpe != null
      ? String(Math.round(Number(workout.session_rpe)))
      : "",
  );
  const [duration, setDuration] = useState(
    workout.duration_s != null ? formatTime(workout.duration_s) : "",
  );
  const [timeCap, setTimeCap] = useState(
    workout.time_cap_s != null ? formatTime(workout.time_cap_s) : "",
  );
  const [location, setLocation] = useState(workout.location ?? "");
  const [bodyweight, setBodyweight] = useState(
    workout.bodyweight_kg != null
      ? String(
          units.weight === "lb"
            ? Math.round(Number(workout.bodyweight_kg) * 2.20462 * 10) / 10
            : Number(workout.bodyweight_kg),
        )
      : "",
  );
  const [notes, setNotes] = useState(workout.notes ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const results = (workout.results ?? [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const bw = bodyweight.trim() === "" ? null : Number(bodyweight);
    try {
      await client.workouts.patch(workout.id, {
        title: title.trim() || null,
        performed_at: `${performedAt}T00:00:00`,
        session_type: sessionType || null,
        workout_format: format || null,
        session_rpe: sessionRpe.trim() === "" ? null : Number(sessionRpe),
        duration_s: parseFlexibleTime(duration),
        time_cap_s: parseFlexibleTime(timeCap),
        location: location.trim() || null,
        bodyweight_kg:
          bw == null || Number.isNaN(bw) ? null : toKg(bw, units.weight),
        notes: notes.trim() || null,
      });
      router.push(`/workouts/${workout.short_hash}`);
      router.refresh();
    } catch (err) {
      setSaving(false);
      if (err instanceof ApiError && err.status === 429) {
        setError("You're editing too fast — try again in a moment.");
      } else {
        setError("Couldn't save your changes. Please try again.");
      }
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className="mx-auto w-full max-w-[640px] px-4 py-4"
    >
      <h1
        className="mb-4 font-sans text-[18px] font-semibold"
        style={{ color: "var(--text)" }}
      >
        Edit session
      </h1>

      <div className="flex flex-col gap-3">
        <Field label="Title">
          <TextInput
            value={title}
            onChange={setTitle}
            placeholder="Untitled session"
          />
        </Field>

        <div className="flex gap-3">
          <Field label="Date">
            <input
              type="date"
              value={performedAt}
              onChange={(e) => setPerformedAt(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </Field>
          <Field label={`Bodyweight (${units.weight})`}>
            <input
              inputMode="decimal"
              value={bodyweight}
              onChange={(e) => setBodyweight(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </Field>
        </div>

        <div className="flex gap-3">
          <Field label="Session type">
            <Select
              value={sessionType}
              onChange={(v) => setSessionType(v as SessionType | "")}
              options={SESSION_TYPES.map((t) => ({
                value: t,
                label: SESSION_LABELS[t],
              }))}
            />
          </Field>
          <Field label="Format">
            <Select
              value={format}
              onChange={(v) => setFormat(v as WorkoutFormat | "")}
              options={FORMATS.map((f) => ({
                value: f,
                label: FORMAT_LABELS[f],
              }))}
            />
          </Field>
        </div>

        <div className="flex gap-3">
          <Field label="Session RPE">
            <Select
              value={sessionRpe}
              onChange={setSessionRpe}
              options={Array.from({ length: 11 }, (_, i) => ({
                value: String(i),
                label: String(i),
              }))}
            />
          </Field>
          <Field label="Duration">
            <input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              onBlur={() => setDuration((d) => normalizeTimeInput(d) || d)}
              placeholder="m:ss"
              className={inputClass}
              style={inputStyle}
            />
          </Field>
          <Field label="Time cap">
            <input
              value={timeCap}
              onChange={(e) => setTimeCap(e.target.value)}
              onBlur={() => setTimeCap((t) => normalizeTimeInput(t) || t)}
              placeholder="m:ss"
              className={inputClass}
              style={inputStyle}
            />
          </Field>
        </div>

        <Field label="Location">
          <TextInput
            value={location}
            onChange={setLocation}
            placeholder="Optional"
          />
        </Field>

        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={`${inputClass} resize-y`}
            style={inputStyle}
          />
        </Field>
      </div>

      {/* Results — read-only / locked (§7). */}
      {results.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center gap-2">
            <span aria-hidden style={{ color: "var(--muted)" }}>
              🔒
            </span>
            <h2
              className="font-sans text-[13px] font-semibold"
              style={{ color: "var(--text)" }}
            >
              Results
            </h2>
          </div>
          <p
            className="mt-1 font-sans text-[12px]"
            style={{ color: "var(--muted)" }}
          >
            Results can&apos;t be edited after commit — delete and re-log to
            change them.
          </p>
          <div
            className="mt-2 flex flex-col gap-1.5 rounded-[10px] p-3"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              opacity: 0.75,
            }}
          >
            {results.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3"
              >
                <span
                  className="font-sans text-[12px]"
                  style={{ color: "var(--muted)" }}
                >
                  {r.movement_name?.trim() || "Movement"}
                </span>
                <span
                  className="font-mono tabular-nums text-[12px]"
                  style={{ color: "var(--muted)" }}
                >
                  {formatResultValue(r, units)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p
          className="mt-4 font-sans text-[13px]"
          style={{ color: "var(--red)" }}
        >
          {error}
        </p>
      )}

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={() => router.push(`/workouts/${workout.short_hash}`)}
          className="rounded-[8px] px-4 py-2 font-sans text-[13px] font-medium"
          style={{ border: "1px solid var(--border)", color: "var(--text)" }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-[8px] px-4 py-2 font-sans text-[13px] font-semibold"
          style={{
            background: "var(--accent)",
            color: "var(--bg)",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

const inputClass = "w-full rounded-[6px] px-2 py-1.5 font-sans text-[13px]";
const inputStyle = {
  background: "var(--bg)",
  color: "var(--text)",
  border: "1px solid var(--border)",
} as const;

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span
        className="font-sans text-[11px] uppercase tracking-wide"
        style={{ color: "var(--muted)" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputClass}
      style={inputStyle}
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
      style={inputStyle}
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
