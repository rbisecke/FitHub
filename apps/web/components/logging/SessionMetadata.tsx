"use client";

import { useState } from "react";
import type { SessionType, WorkoutFormat } from "@/lib/api";
import { SESSION_LABELS, FORMAT_LABELS } from "@/lib/display";
import type { DraftSession } from "./types";

const SESSION_TYPES = Object.keys(SESSION_LABELS) as SessionType[];
const FORMATS = Object.keys(FORMAT_LABELS) as WorkoutFormat[];
const RPE_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Expandable session-details block (01 §2.2, §2.3). Collapsed by default so the
 * movement table is what the user lands on. Enum fields are chip pickers, RPE is
 * a stepped chip row, times use flexible input (normalized on blur elsewhere).
 */
export function SessionMetadata({
  session,
  patch,
}: {
  session: DraftSession;
  patch: (p: Partial<DraftSession>) => void;
}) {
  const [open, setOpen] = useState(false);

  const chip = (active: boolean) => ({
    background: active ? "var(--accent)" : "var(--surface)",
    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
    color: active ? "var(--bg)" : "var(--muted)",
  });

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    mode: "text" | "decimal" = "text",
  ) => (
    <div className="flex flex-col gap-1">
      <label
        className="font-data text-[10px] uppercase tracking-wide"
        style={{ color: "var(--muted)" }}
      >
        {label}
      </label>
      <input
        value={value}
        inputMode={mode === "decimal" ? "decimal" : "text"}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[6px] px-2.5 py-1.5 font-sans text-[13px] outline-none"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--text)",
        }}
      />
    </div>
  );

  return (
    <div
      className="rounded-[8px]"
      style={{ border: "1px solid var(--border)" }}
      data-testid="session-metadata"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <span
          className="font-sans text-[13px] font-medium"
          style={{ color: "var(--text)" }}
        >
          Session details
        </span>
        <span
          className="font-data text-[12px]"
          style={{ color: "var(--muted)" }}
        >
          {open ? "hide" : "show"}
        </span>
      </button>

      {open && (
        <div className="space-y-4 px-4 pb-4">
          <div>
            <p
              className="mb-1.5 font-data text-[10px] uppercase tracking-wide"
              style={{ color: "var(--muted)" }}
            >
              Type
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SESSION_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    patch({ sessionType: session.sessionType === t ? null : t })
                  }
                  className="rounded-[6px] px-2.5 py-1.5 font-data text-[11px]"
                  style={chip(session.sessionType === t)}
                >
                  {SESSION_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p
              className="mb-1.5 font-data text-[10px] uppercase tracking-wide"
              style={{ color: "var(--muted)" }}
            >
              Format
            </p>
            <div className="flex flex-wrap gap-1.5">
              {FORMATS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() =>
                    patch({
                      workoutFormat: session.workoutFormat === f ? null : f,
                    })
                  }
                  className="rounded-[6px] px-2.5 py-1.5 font-data text-[11px]"
                  style={chip(session.workoutFormat === f)}
                >
                  {FORMAT_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p
              className="mb-1.5 font-data text-[10px] uppercase tracking-wide"
              style={{ color: "var(--muted)" }}
            >
              Session RPE
            </p>
            <div className="flex flex-wrap gap-1">
              {RPE_STEPS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() =>
                    patch({ sessionRpe: session.sessionRpe === n ? null : n })
                  }
                  aria-label={`Session RPE ${n}`}
                  aria-pressed={session.sessionRpe === n}
                  className="h-9 w-9 rounded-[6px] font-mono tabular-nums text-[12px]"
                  style={chip(session.sessionRpe === n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {field("Duration", session.durationInput, (v) =>
              patch({ durationInput: v }),
            )}
            {field("Time cap", session.timeCapInput, (v) =>
              patch({ timeCapInput: v }),
            )}
            {field("Location", session.location, (v) => patch({ location: v }))}
            {field(
              "Bodyweight",
              session.bodyweight,
              (v) => patch({ bodyweight: v }),
              "decimal",
            )}
          </div>

          <label className="flex flex-col gap-1">
            <span
              className="font-data text-[10px] uppercase tracking-wide"
              style={{ color: "var(--muted)" }}
            >
              Notes
            </span>
            <textarea
              value={session.notes}
              maxLength={5000}
              onChange={(e) => patch({ notes: e.target.value })}
              rows={2}
              className="resize-none rounded-[6px] px-2.5 py-1.5 font-sans text-[13px] outline-none"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
          </label>
        </div>
      )}
    </div>
  );
}
