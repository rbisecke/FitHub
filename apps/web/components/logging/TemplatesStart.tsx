"use client";

import { useEffect, useState } from "react";
import type { SavedRoutine, WorkoutSummary } from "@/lib/api";
import { createApiClient } from "@/lib/api/client";

/** First-4-then-"+N more" movement-name preview (01 §2.9). */
function preview(names: string[]): string {
  if (names.length === 0) return "No movements";
  const head = names.slice(0, 4).join(", ");
  const extra = names.length - 4;
  return extra > 0 ? `${head}, +${extra} more` : head;
}

/**
 * Templates & quick-start on an empty session (01 §2.9): Start empty, saved
 * routine cards (first, deliberate choices), then the 3 most recent workouts as
 * the always-populated fallback.
 */
export function TemplatesStart({
  token,
  onStartFromRoutine,
  onPickMovement,
  onManage,
}: {
  token: string;
  onStartFromRoutine: (routine: SavedRoutine) => void;
  onPickMovement: () => void;
  onManage: () => void;
}) {
  const [routines, setRoutines] = useState<SavedRoutine[]>([]);
  const [recent, setRecent] = useState<WorkoutSummary[]>([]);

  useEffect(() => {
    const client = createApiClient(token);
    const controller = new AbortController();
    let cancelled = false;
    Promise.allSettled([
      client.routines.list({ signal: controller.signal }),
      client.workouts.list({ limit: 3 }, { signal: controller.signal }),
    ]).then(([r, w]) => {
      if (cancelled) return;
      if (r.status === "fulfilled") setRoutines(r.value);
      if (w.status === "fulfilled") setRecent(w.value.items);
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [token]);

  return (
    <div className="mb-4 space-y-4" data-testid="templates-start">
      <button
        type="button"
        onClick={onPickMovement}
        className="w-full rounded-[10px] py-3 font-sans text-[14px] font-semibold"
        style={{ background: "var(--accent)", color: "var(--bg)" }}
      >
        Start empty
      </button>

      {routines.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p
              className="font-data text-[10px] uppercase tracking-wide"
              style={{ color: "var(--muted)" }}
            >
              Saved routines
            </p>
            <button
              type="button"
              onClick={onManage}
              className="font-sans text-[12px]"
              style={{ color: "var(--accent)" }}
            >
              Manage
            </button>
          </div>
          <div className="space-y-2">
            {routines.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onStartFromRoutine(r)}
                className="flex w-full flex-col items-start rounded-[10px] px-4 py-3 text-left"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <span
                  className="font-sans text-[14px] font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  {r.name}
                </span>
                <span
                  className="font-sans text-[12px]"
                  style={{ color: "var(--muted)" }}
                >
                  {preview(
                    (r.movements ?? []).map(
                      (m) => m.movement_name ?? "movement",
                    ),
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <div>
          <p
            className="mb-2 font-data text-[10px] uppercase tracking-wide"
            style={{ color: "var(--muted)" }}
          >
            Start from recent
          </p>
          <div className="space-y-2">
            {recent.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between rounded-[10px] px-4 py-3"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <span
                  className="font-sans text-[13px]"
                  style={{ color: "var(--text)" }}
                >
                  {w.title || "Untitled session"}
                </span>
                <span
                  className="font-mono tabular-nums text-[11px]"
                  style={{ color: "var(--muted)" }}
                >
                  {w.result_count} sets
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
