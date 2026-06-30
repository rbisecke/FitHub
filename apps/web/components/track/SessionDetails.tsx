"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { RPEStepper } from "./RPEStepper";

const SESSION_TYPES = ["Strength", "Metcon", "Gymnastics", "Cardio", "Mixed"];

export interface SessionDetailsState {
  date: string;
  sessionType: string;
  rpe: number;
  notes: string;
}

interface Props {
  state: SessionDetailsState;
  onChange: (patch: Partial<SessionDetailsState>) => void;
}

export function SessionDetails({ state, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--surface-2)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[14px] text-[var(--foreground)]">
            Session details
          </span>
          {!open && (
            <span className="text-[11px] text-[var(--muted)] font-data">
              {state.date} · {state.sessionType}
              {state.rpe > 0 ? ` · RPE ${state.rpe}` : ""}
            </span>
          )}
        </div>
        <ChevronDown
          className={[
            "h-4 w-4 text-[var(--muted)] transition-transform duration-200",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5 border-t border-[var(--border)] pt-4">
          {/* Date */}
          <div>
            <label className="block text-[12px] text-[var(--muted)] mb-2">
              Date
            </label>
            <input
              type="date"
              value={state.date}
              onChange={(e) => onChange({ date: e.target.value })}
              className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-2.5 font-data text-[13.5px] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors w-full sm:w-auto"
            />
          </div>

          {/* Session type segmented control */}
          <div>
            <label className="block text-[12px] text-[var(--muted)] mb-2">
              Session type
            </label>
            <div className="flex flex-wrap gap-2">
              {SESSION_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => onChange({ sessionType: type })}
                  className={[
                    "px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all",
                    state.sessionType === type
                      ? "bg-[var(--accent)] text-[#0A0D12] font-bold"
                      : "bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted)]",
                  ].join(" ")}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* RPE */}
          <RPEStepper
            value={state.rpe}
            onChange={(v) => onChange({ rpe: v })}
          />

          {/* Notes */}
          <div>
            <label className="block text-[12px] text-[var(--muted)] mb-2">
              Notes{" "}
              <span className="text-[var(--muted)] font-normal">
                (optional)
              </span>
            </label>
            <textarea
              value={state.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="How did it feel? Any injuries, PRs, or observations..."
              rows={2}
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 font-data text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-y"
            />
          </div>
        </div>
      )}
    </div>
  );
}
