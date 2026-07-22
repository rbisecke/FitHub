"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Movement, ResultType } from "@/lib/api";
import { ApiError, createApiClient } from "@/lib/api/client";
import { SheetOverlay } from "./SheetOverlay";
import { MovementSearchSheet } from "./MovementSearchSheet";
import { buildCreateWorkout, parseFlexibleTime } from "./logBuild";
import { EMPTY_QUICK_SESSION, singleEntryFromMovement } from "./quickShared";

type Feedback =
  | { kind: "none" }
  | { kind: "loading" }
  | { kind: "first" }
  | { kind: "pr"; prev: number }
  | { kind: "tie" }
  | { kind: "below"; delta: number };

const LOWER_IS_BETTER: ResultType[] = ["time", "pace"];

/** The DraftSet field a single tagged value maps to, per result type (01 §4). */
const FIELD_FOR_TYPE: Record<ResultType, string> = {
  weight: "load",
  reps: "reps",
  time: "time",
  distance: "distance",
  calories: "calories",
  height: "height",
  rounds_reps: "rounds",
  watts: "watts",
  pace: "pace",
};

/** Unit suffix for the live-feedback strip; empty when a bare number reads fine. */
function unitFor(resultType: ResultType, weightUnit: string): string {
  if (resultType === "weight") return weightUnit;
  if (resultType === "distance") return "m";
  if (resultType === "calories") return " cal";
  if (resultType === "watts") return "W";
  return "";
}

/**
 * Tag a milestone (01 §4): a single best-effort attempt with live, client-side
 * PR feedback as the user types. Creates a Workout with is_tag: true and one
 * Result. The feedback is pure client arithmetic against the fetched last value
 * — type-aware direction-of-better — NOT the server's 1RM flagging.
 */
export function TagMilestoneSheet({
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
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [prev, setPrev] = useState<number | null>(null);
  const [prevLoading, setPrevLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resultType: ResultType =
    movement?.default_result_type ??
    movement?.default_result_types[0] ??
    "weight";

  useEffect(() => {
    if (!movement) return;
    const controller = new AbortController();
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setPrevLoading(true);
    });
    client.movements
      .lastResult(movement.id, undefined, { signal: controller.signal })
      .then((r) => {
        if (cancelled) return;
        const v =
          r.load_kg != null
            ? Number(r.load_kg)
            : r.time_s != null
              ? r.time_s
              : r.distance_m != null
                ? Number(r.distance_m)
                : null;
        setPrev(v);
        setPrevLoading(false);
      })
      .catch(() => {
        if (!cancelled && !controller.signal.aborted) {
          setPrev(null);
          setPrevLoading(false);
        }
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [movement, client]);

  const lower = LOWER_IS_BETTER.includes(resultType);

  const feedback: Feedback = useMemo(() => {
    if (!value.trim()) return { kind: "none" };
    if (prevLoading) return { kind: "loading" };
    if (prev == null) return { kind: "first" };
    // Time/pace are entered as flexible m:ss; everything else is a bare number.
    const v = lower ? parseFlexibleTime(value) : Number(value);
    if (v == null || Number.isNaN(v)) return { kind: "none" };
    if (v === prev) return { kind: "tie" };
    const better = lower ? v < prev : v > prev;
    if (better) return { kind: "pr", prev };
    return { kind: "below", delta: Math.abs(v - prev) };
  }, [value, prev, prevLoading, resultType, lower]);

  const fb = feedbackStyle(feedback, resultType, weightUnit);

  if (!movement) {
    return (
      <MovementSearchSheet
        token={token}
        onPick={setMovement}
        onClose={onClose}
      />
    );
  }

  async function handleTag() {
    setSaving(true);
    setError(null);
    const entry = singleEntryFromMovement(movement!, resultType, {
      [FIELD_FOR_TYPE[resultType]]: value,
    });
    const body = buildCreateWorkout(
      { ...EMPTY_QUICK_SESSION, entries: [entry], notes: note },
      new Date().toISOString(),
    );
    try {
      const created = await client.workouts.create({ ...body, is_tag: true });
      router.push(`/workouts/${created.short_hash}?logged=1`);
    } catch (err) {
      setSaving(false);
      setError(
        err instanceof ApiError && err.status === 429
          ? "Logging very fast — try again in a moment."
          : "Couldn't tag — check your connection and retry.",
      );
    }
  }

  return (
    <SheetOverlay title="Tag a milestone" onClose={onClose} maxHeight="66dvh">
      <p
        className="mb-3 font-sans text-[14px] font-semibold"
        style={{ color: "var(--text)" }}
      >
        {movement.name}
      </p>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="0"
        aria-label="Milestone value"
        className="mb-2 w-full rounded-[8px] px-3 py-2 text-right font-mono tabular-nums text-[20px] outline-none"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--text)",
        }}
      />
      {fb && (
        <div
          className="mb-3 rounded-[8px] px-3 py-2 font-sans text-[13px] font-medium"
          style={{ background: fb.bg, color: fb.color }}
          data-testid="pr-feedback-strip"
        >
          {fb.text}
        </div>
      )}
      <textarea
        value={note}
        maxLength={280}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Note (optional)"
        aria-label="Note"
        className="mb-3 w-full resize-none rounded-[8px] px-3 py-2 font-sans text-[13px] outline-none"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--text)",
        }}
      />
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
        onClick={handleTag}
        disabled={saving}
        className="w-full rounded-[8px] py-2.5 font-sans text-[14px] font-semibold disabled:opacity-60"
        style={{ background: "var(--accent)", color: "var(--bg)" }}
      >
        {saving ? "Tagging…" : "Tag it"}
      </button>
    </SheetOverlay>
  );
}

function fmtValue(v: number, resultType: ResultType, unit: string): string {
  if (LOWER_IS_BETTER.includes(resultType)) {
    return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`;
  }
  return `${v}${unit}`;
}

function feedbackStyle(
  fb: Feedback,
  resultType: ResultType,
  weightUnit: string,
): { text: string; bg: string; color: string } | null {
  const unit = unitFor(resultType, weightUnit);
  switch (fb.kind) {
    case "none":
      return null;
    case "loading":
      return {
        text: "Checking your best…",
        bg: "var(--surface)",
        color: "var(--muted)",
      };
    case "first":
      return {
        text: "First time logging this",
        bg: "var(--surface)",
        color: "var(--muted)",
      };
    case "pr":
      return {
        text: `New PR! (was ${fmtValue(fb.prev, resultType, unit)})`,
        bg: "color-mix(in srgb, var(--green) 16%, var(--bg))",
        color: "var(--green)",
      };
    case "tie":
      return {
        text: "Ties your best",
        bg: "color-mix(in srgb, var(--amber) 16%, var(--bg))",
        color: "var(--amber)",
      };
    case "below":
      return {
        // "off your best" reads correctly for both directions (a slower time and
        // a lighter lift are both simply short of the record).
        text: `${fmtValue(fb.delta, resultType, unit)} off your best`,
        bg: "color-mix(in srgb, var(--red) 14%, var(--bg))",
        color: "var(--red)",
      };
  }
}
