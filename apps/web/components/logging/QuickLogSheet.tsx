"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Movement } from "@/lib/api";
import { ApiError, createApiClient } from "@/lib/api/client";
import { SheetOverlay } from "./SheetOverlay";
import { MovementSearchSheet } from "./MovementSearchSheet";
import { columnsFor } from "./resultColumns";
import { buildCreateWorkout } from "./logBuild";
import { EMPTY_QUICK_SESSION, singleEntryFromMovement } from "./quickShared";

/**
 * Quick log (01 §3): one result against one movement in the fewest taps. Under
 * the hood it still creates a full Workout with a single Result.
 */
export function QuickLogSheet({
  token,
  weightUnit = "kg",
  onClose,
}: {
  token: string;
  weightUnit?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const client = useMemo(() => createApiClient(token), [token]);
  const [movement, setMovement] = useState<Movement | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!movement) {
    return (
      <MovementSearchSheet
        token={token}
        onPick={setMovement}
        onClose={onClose}
      />
    );
  }

  const resultType =
    movement.default_result_type ??
    movement.default_result_types[0] ??
    "weight";
  const cols = columnsFor(resultType, weightUnit);

  async function handleLog() {
    setSaving(true);
    setError(null);
    const entry = singleEntryFromMovement(movement!, resultType, values);
    try {
      const created = await client.workouts.create(
        buildCreateWorkout(
          { ...EMPTY_QUICK_SESSION, entries: [entry] },
          new Date().toISOString(),
        ),
      );
      router.push(`/workouts/${created.short_hash}`);
    } catch (err) {
      setSaving(false);
      setError(
        err instanceof ApiError && err.status === 429
          ? "Logging very fast — try again in a moment."
          : "Couldn't log — check your connection and retry.",
      );
    }
  }

  return (
    <SheetOverlay title="Quick log" onClose={onClose} maxHeight="60dvh">
      <p
        className="mb-3 font-sans text-[14px] font-semibold"
        style={{ color: "var(--text)" }}
      >
        {movement.name}
      </p>
      <div className="mb-4 flex gap-2">
        {cols.map((c) => (
          <div key={c.key} className="flex-1">
            <label
              className="mb-1 block font-data text-[10px] uppercase"
              style={{ color: "var(--muted)" }}
            >
              {c.label}
            </label>
            <input
              inputMode={c.mode}
              value={values[c.key] ?? ""}
              onChange={(e) =>
                setValues((v) => ({ ...v, [c.key]: e.target.value }))
              }
              placeholder={c.placeholder}
              aria-label={c.label}
              className="w-full rounded-[8px] px-3 py-2 text-right font-mono tabular-nums text-[16px] outline-none"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
          </div>
        ))}
      </div>
      {error && (
        <p
          className="mb-3 font-sans text-[13px]"
          style={{ color: "var(--red)" }}
        >
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={handleLog}
        disabled={saving}
        className="w-full rounded-[8px] py-2.5 font-sans text-[14px] font-semibold disabled:opacity-60"
        style={{ background: "var(--accent)", color: "var(--bg)" }}
      >
        {saving ? "Logging…" : "Log"}
      </button>
    </SheetOverlay>
  );
}
