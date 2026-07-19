"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import type { RestTimerApi } from "@/lib/hooks/useRestTimer";

const PRESETS = [60, 90, 120, 180];

function fmt(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Rest timer (01 §2.10): compact chip + expanded countdown. Presets 60/90/120/180,
 * ±15s + Skip while running, a ±5s custom stepper, and a zero-cue (visual pulse +
 * haptic tick, reduced-motion respected). Driven by the shared useRestTimer hook.
 */
export function RestTimer({ timer }: { timer: RestTimerApi }) {
  const [expanded, setExpanded] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const prevRemaining = useRef(timer.remaining);

  // Zero-cue: fire once on the active→0 transition.
  useEffect(() => {
    const justHitZero = prevRemaining.current > 0 && timer.remaining === 0;
    prevRemaining.current = timer.remaining;
    if (!justHitZero) return;
    try {
      navigator.vibrate?.(120);
    } catch {
      // vibration unsupported — visual pulse still fires
    }
    if (prefersReducedMotion) return;
    // Defer into a timeout so no setState runs synchronously during the effect.
    const onId = setTimeout(() => setPulsing(true), 0);
    const offId = setTimeout(() => setPulsing(false), 1200);
    return () => {
      clearTimeout(onId);
      clearTimeout(offId);
    };
  }, [timer.remaining, prefersReducedMotion]);

  if (!timer.enabled && !timer.active) return null;

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="inline-flex items-center gap-2 rounded-full px-3 py-1.5"
        style={{
          background: "var(--surface)",
          border: `1px solid ${pulsing ? "var(--accent)" : "var(--border)"}`,
          transition: prefersReducedMotion ? "none" : "border-color 300ms",
        }}
        aria-label="Rest timer"
      >
        <span
          className="font-data text-[11px]"
          style={{ color: "var(--muted)" }}
        >
          Rest
        </span>
        <span
          className="font-mono tabular-nums text-[13px]"
          style={{ color: timer.active ? "var(--accent)" : "var(--muted)" }}
        >
          {fmt(timer.active ? timer.remaining : timer.duration)}
        </span>
      </button>
    );
  }

  return (
    <div
      className="rounded-[12px] p-4"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className="font-mono tabular-nums text-[28px]"
          style={{
            color: timer.active ? "var(--accent)" : "var(--text)",
            transform:
              pulsing && !prefersReducedMotion ? "scale(1.06)" : "scale(1)",
            transition: prefersReducedMotion ? "none" : "transform 300ms",
          }}
        >
          {fmt(timer.active ? timer.remaining : timer.duration)}
        </span>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          aria-label="Collapse rest timer"
          className="flex h-9 items-center px-2 font-data text-[12px]"
          style={{ color: "var(--muted)" }}
        >
          collapse
        </button>
      </div>

      {timer.active ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => timer.start(Math.max(5, timer.remaining - 15))}
            className="flex-1 rounded-[6px] py-2 font-data text-[12px]"
            style={{ border: "1px solid var(--border)", color: "var(--text)" }}
          >
            −15s
          </button>
          <button
            type="button"
            onClick={() => timer.start(timer.remaining + 15)}
            className="flex-1 rounded-[6px] py-2 font-data text-[12px]"
            style={{ border: "1px solid var(--border)", color: "var(--text)" }}
          >
            +15s
          </button>
          <button
            type="button"
            onClick={timer.stop}
            className="flex-1 rounded-[6px] py-2 font-data text-[12px]"
            style={{ border: "1px solid var(--border)", color: "var(--red)" }}
          >
            Skip
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => timer.setDuration(p)}
                aria-pressed={timer.duration === p}
                className="rounded-[6px] px-2.5 py-1.5 font-mono tabular-nums text-[12px]"
                style={{
                  background:
                    timer.duration === p ? "var(--accent)" : "transparent",
                  border: `1px solid ${
                    timer.duration === p ? "var(--accent)" : "var(--border)"
                  }`,
                  color: timer.duration === p ? "#fff" : "var(--muted)",
                }}
              >
                {fmt(p)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => timer.setDuration(Math.max(5, timer.duration - 5))}
              aria-label="Decrease rest by 5 seconds"
              className="h-9 w-9 rounded-[6px] font-data text-[14px]"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              −
            </button>
            <button
              type="button"
              onClick={() => timer.setDuration(timer.duration + 5)}
              aria-label="Increase rest by 5 seconds"
              className="h-9 w-9 rounded-[6px] font-data text-[14px]"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              +
            </button>
            <button
              type="button"
              onClick={() => timer.start()}
              className="ml-auto rounded-[6px] px-4 py-2 font-data text-[12px]"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Start
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
