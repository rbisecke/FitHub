"use client";

import { useState } from "react";
import type {
  Movement,
  Modality,
  MovementPattern,
  LimbStyle,
  ResultType,
} from "@/lib/api";
import { ApiError, type ApiClient } from "@/lib/api/client";

const MODALITIES: Modality[] = [
  "strength",
  "weightlifting",
  "gymnastics",
  "mono_structural",
  "plyometric",
  "carry",
  "strongman",
];
const PATTERNS: MovementPattern[] = [
  "squat",
  "hinge",
  "push_horizontal",
  "push_vertical",
  "pull_horizontal",
  "pull_vertical",
  "carry",
  "rotation",
  "locomotion",
];
const LIMB_STYLES: LimbStyle[] = ["bilateral", "unilateral", "alternating"];
const RESULT_TYPES: ResultType[] = [
  "weight",
  "reps",
  "time",
  "distance",
  "calories",
  "height",
  "rounds_reps",
  "watts",
  "pace",
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Create a custom movement (01 §8). Any authenticated user can add to the shared
 * catalog — no admin gate — so the copy gently encourages reuse. Required: name,
 * slug (auto-suggested, ^[a-z0-9-]+$), base_movement, modality. A uniqueness
 * conflict surfaces a friendly message, never a raw DB error.
 */
export function CreateMovementForm({
  initialName = "",
  client,
  onCreated,
  onCancel,
}: {
  initialName?: string;
  client: ApiClient;
  onCreated: (m: Movement) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(slugify(initialName));
  const [slugTouched, setSlugTouched] = useState(false);
  const [baseMovement, setBaseMovement] = useState(initialName);
  const [modality, setModality] = useState<Modality>("strength");
  const [pattern, setPattern] = useState<MovementPattern | "">("");
  const [limbStyle, setLimbStyle] = useState<LimbStyle | "">("");
  const [implement, setImplement] = useState("");
  const [resultType, setResultType] = useState<ResultType>("weight");
  const [tempo, setTempo] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slugValid = /^[a-z0-9-]+$/.test(slug);
  const canSubmit =
    name.trim() !== "" && baseMovement.trim() !== "" && slugValid;

  function handleNameChange(v: string) {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
    if (baseMovement.trim() === "" || baseMovement === name) setBaseMovement(v);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const created = await client.movements.create({
        name: name.trim(),
        slug,
        base_movement: baseMovement.trim(),
        modality,
        movement_pattern: pattern || null,
        limb_style: limbStyle || null,
        implement: implement.trim() || null,
        default_result_type: resultType,
        default_result_types: [resultType],
        tempo: tempo.trim() || null,
      });
      onCreated(created);
    } catch (err) {
      setSaving(false);
      if (err instanceof ApiError && err.status === 409) {
        setError("A movement with that name or slug already exists.");
      } else {
        setError("Couldn't create the movement. Please try again.");
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="font-sans text-[12px]" style={{ color: "var(--muted)" }}>
        Search first — is it already here as a variant? Adding a duplicate
        clutters the shared catalog.
      </p>

      <Field label="Name">
        <input
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g. Bulgarian Split Squat"
          className={inputClass}
          style={inputStyle}
        />
      </Field>

      <Field label="Slug">
        <input
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          className={inputClass}
          style={inputStyle}
        />
        {!slugValid && slug !== "" && (
          <span
            className="font-sans text-[11px]"
            style={{ color: "var(--red)" }}
          >
            Lowercase letters, numbers and hyphens only.
          </span>
        )}
      </Field>

      <Field label="Base movement">
        <input
          value={baseMovement}
          onChange={(e) => setBaseMovement(e.target.value)}
          className={inputClass}
          style={inputStyle}
        />
      </Field>

      <div className="flex gap-3">
        <Field label="Modality (required)">
          <Select
            value={modality}
            onChange={(v) => setModality(v as Modality)}
            options={MODALITIES}
          />
        </Field>
        <Field label="Default result">
          <Select
            value={resultType}
            onChange={(v) => setResultType(v as ResultType)}
            options={RESULT_TYPES}
          />
        </Field>
      </div>

      <div className="flex gap-3">
        <Field label="Pattern">
          <Select
            value={pattern}
            onChange={(v) => setPattern(v as MovementPattern | "")}
            options={PATTERNS}
            allowEmpty
          />
        </Field>
        <Field label="Limb style">
          <Select
            value={limbStyle}
            onChange={(v) => setLimbStyle(v as LimbStyle | "")}
            options={LIMB_STYLES}
            allowEmpty
          />
        </Field>
      </div>

      <div className="flex gap-3">
        <Field label="Implement">
          <input
            value={implement}
            onChange={(e) => setImplement(e.target.value)}
            placeholder="e.g. Barbell"
            className={inputClass}
            style={inputStyle}
          />
        </Field>
        <Field label="Tempo">
          <input
            value={tempo}
            onChange={(e) => setTempo(e.target.value)}
            placeholder="e.g. 30X1"
            className={inputClass}
            style={inputStyle}
          />
        </Field>
      </div>

      {error && (
        <p className="font-sans text-[13px]" style={{ color: "var(--red)" }}>
          {error}
        </p>
      )}

      <div className="mt-1 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[8px] px-4 py-2 font-sans text-[13px] font-medium"
          style={{ border: "1px solid var(--border)", color: "var(--text)" }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit || saving}
          className="rounded-[8px] px-4 py-2 font-sans text-[13px] font-semibold"
          style={{
            background: "var(--accent)",
            color: "var(--bg)",
            opacity: !canSubmit || saving ? 0.6 : 1,
          }}
        >
          {saving ? "Creating…" : "Create movement"}
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

function Select({
  value,
  onChange,
  options,
  allowEmpty = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  allowEmpty?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
      style={inputStyle}
    >
      {allowEmpty && <option value="">—</option>}
      {options.map((o) => (
        <option key={o} value={o}>
          {o.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
}
