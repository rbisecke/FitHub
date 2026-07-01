"use client";
import { X } from "lucide-react";

export interface Movement {
  id: string;
  name: string;
  sets: number;
  reps: number;
  load: number;
  unit: "kg" | "lb";
}

interface Props {
  movements: Movement[];
  onChange: (
    id: string,
    field: keyof Pick<Movement, "sets" | "reps" | "load">,
    value: number,
  ) => void;
  onRemove: (id: string) => void;
}

export function StagedChanges({ movements, onChange, onRemove }: Props) {
  if (movements.length === 0) return null;

  return (
    <div className="animate-fadeUp">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-[14px] text-[var(--foreground)]">
            Staged changes
          </span>
          <span className="font-data text-[11px] text-[var(--muted)]">
            git diff --cached
          </span>
        </div>
        <span className="text-[11px] bg-[var(--surface-2)] border border-[var(--border)] px-2.5 py-0.5 rounded-full text-[var(--muted)]">
          {movements.length} movement{movements.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-2.5">
        {movements.map((m) => (
          <div
            key={m.id}
            className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4 flex-wrap"
          >
            <span className="font-bold text-[14px] flex-1 min-w-0 text-[var(--foreground)]">
              {m.name}
            </span>

            <div className="flex items-center gap-3">
              {(["sets", "reps"] as const).map((field) => (
                <div key={field} className="flex flex-col items-center gap-1">
                  <label className="text-[10px] text-[var(--muted)] uppercase tracking-wide">
                    {field}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={m[field]}
                    onChange={(e) =>
                      onChange(m.id, field, Number(e.target.value))
                    }
                    className="w-[52px] bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-[6px_8px] font-data text-[14px] text-center text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </div>
              ))}

              <div className="flex flex-col items-center gap-1">
                <label className="text-[10px] text-[var(--muted)] uppercase tracking-wide">
                  load
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    value={m.load}
                    onChange={(e) =>
                      onChange(m.id, "load", Number(e.target.value))
                    }
                    className="w-[64px] bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-[6px_8px] font-data text-[14px] text-center text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                  <span className="text-[12px] text-[var(--muted)]">
                    {m.unit}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onRemove(m.id)}
              className="text-[var(--muted)] hover:text-[var(--destructive)] transition-colors ml-auto flex-shrink-0"
              aria-label={`Remove ${m.name}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
