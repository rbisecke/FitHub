"use client";

import { useState } from "react";
import { api } from "@/lib/api/client";

interface Props {
  token: string;
  initialSubmitted: boolean;
  initialCheckin?: {
    sleep: number;
    stress: number;
    fatigue: number;
    soreness: number;
    hooper_index: number;
  } | null;
}

type RowKey = "sleep" | "stress" | "fatigue" | "soreness";

const ROWS: { key: RowKey; label: string }[] = [
  { key: "sleep", label: "Sleep" },
  { key: "stress", label: "Stress" },
  { key: "fatigue", label: "Fatigue" },
  { key: "soreness", label: "Soreness" },
];

function pipColor(value: number): string {
  if (value <= 2) return "var(--accent)";
  if (value <= 5) return "var(--amber)";
  return "var(--red)";
}

function hooperColor(index: number): string {
  if (index <= 12) return "var(--accent)";
  if (index <= 18) return "var(--amber)";
  return "var(--red)";
}

function hooperLabel(index: number): string {
  if (index <= 12) return "Ready to train";
  if (index <= 18) return "Moderate readiness";
  return "Recover first";
}

function PipSelector({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const pips = 7;
  return (
    <div className="flex gap-[4px]">
      {Array.from({ length: pips }, (_, i) => {
        const pip = i + 1;
        const active = pip <= value;
        const color = active ? pipColor(pip) : undefined;
        return (
          <button
            key={pip}
            onClick={() => onChange(pip)}
            className="h-[20px] w-[20px] rounded-[3px] border transition-colors"
            style={{
              background: active ? color : "var(--surface)",
              borderColor: active ? color : "var(--border)",
            }}
            aria-label={`${label} ${pip} of ${pips}`}
          />
        );
      })}
    </div>
  );
}

export function HooperCheckIn({
  token,
  initialSubmitted,
  initialCheckin,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [submitted, setSubmitted] = useState(initialSubmitted);
  const [submittedData, setSubmittedData] = useState(initialCheckin ?? null);
  const [values, setValues] = useState<Record<RowKey, number>>({
    sleep: 4,
    stress: 4,
    fatigue: 4,
    soreness: 4,
  });
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const total = values.sleep + values.stress + values.fatigue + values.soreness;

  if (submitted && submittedData) {
    return (
      <div
        className="rounded-xl border px-4 py-3 flex items-center gap-2"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <span
          className="font-mono text-[11px]"
          style={{ color: "var(--muted)" }}
        >
          Hooper{" "}
          <span
            className="font-semibold"
            style={{ color: hooperColor(submittedData.hooper_index) }}
          >
            {submittedData.hooper_index}
          </span>{" "}
          · logged today
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--accent)" }}
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  }

  if (!expanded) {
    return (
      <div
        className="rounded-xl border px-4 py-3 flex items-center justify-between"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-[6px] h-[6px] rounded-full"
            style={{ background: "var(--muted)" }}
          />
          <span
            className="font-mono text-[11px]"
            style={{ color: "var(--muted)" }}
          >
            $ git status --health
          </span>
        </div>
        <button
          onClick={() => setExpanded(true)}
          className="font-mono text-[11px] transition-opacity hover:opacity-70"
          style={{ color: "var(--blue)" }}
        >
          Log readiness →
        </button>
      </div>
    );
  }

  async function handleSubmit() {
    setSaving(true);
    setSubmitError(null);
    try {
      const res = await api.wellness.checkin(token, values);
      setSubmittedData(res);
      setSubmitted(true);
    } catch {
      setSubmitError("Failed to save check-in. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between">
        <span
          className="font-mono text-[11px] uppercase tracking-[0.5px]"
          style={{ color: "var(--muted)" }}
        >
          Daily readiness check-in
        </span>
        <button
          onClick={() => setExpanded(false)}
          aria-label="Close check-in"
          className="font-mono text-[10px] transition-opacity hover:opacity-70"
          style={{ color: "var(--muted)" }}
        >
          ✕
        </button>
      </div>

      {/* Pip selectors */}
      <div className="space-y-2">
        {ROWS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <span
              className="font-mono text-[11px] w-16 flex-shrink-0"
              style={{ color: "var(--muted)" }}
            >
              {label}
            </span>
            <PipSelector
              value={values[key]}
              onChange={(v) => setValues((prev) => ({ ...prev, [key]: v }))}
              label={label}
            />
          </div>
        ))}
      </div>

      {/* Live total */}
      <div className="border-t pt-2" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-baseline justify-between">
          <span
            className="font-mono text-[10px] uppercase tracking-[0.4px]"
            style={{ color: "var(--muted)" }}
          >
            Hooper score
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className="font-mono text-[15px] font-semibold tabular-nums"
              style={{ color: hooperColor(total) }}
            >
              {total}
            </span>
            <span
              className="font-mono text-[10px]"
              style={{ color: "var(--muted)" }}
            >
              / 28 · {hooperLabel(total)}
            </span>
          </div>
        </div>
      </div>

      {/* Submit */}
      {submitError && (
        <p className="text-sm text-[var(--red)] mt-2">{submitError}</p>
      )}
      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full rounded-lg border px-4 py-2 font-mono text-[12px] font-semibold transition-opacity disabled:opacity-50 hover:opacity-80"
        style={{
          background: "var(--surface)",
          borderColor: "var(--accent)",
          color: "var(--accent)",
        }}
      >
        {saving ? "Committing…" : "Commit check-in"}
      </button>
    </div>
  );
}
