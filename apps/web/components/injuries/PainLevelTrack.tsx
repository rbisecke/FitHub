"use client";

import { useRef } from "react";
import { PAIN_WORD_ANCHORS, isHighPain, painColorToken } from "./painLevel";

/**
 * Pain-level input (05 §1.2) — a purpose-built discrete tap-along-a-track
 * control, NOT a restyled shadcn `Slider`. It must capture an exact integer
 * (`pain_level ≥ 8` alone forces a medical referral), so a purely visual
 * continuous drag would break that deterministic rule. Implemented as a
 * single full-width track (comfortably ≥44px tall — the touch-target rule
 * applied to the control as a whole rather than eleven separately-boxed
 * sub-44px stops) with `role="slider"` semantics: click/tap snaps to the
 * nearest integer stop, arrow keys step by one.
 */
export function PainLevelTrack({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (level: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const level = value ?? 0;
  const color = painColorToken(level);
  const highPain = isHighPain(level);

  function levelFromClientX(clientX: number): number {
    const track = trackRef.current;
    if (!track) return level;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(ratio * 10);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Explicit focus (not just relying on focus-follows-pointer, which is
    // inconsistent on mobile Safari) so a tap can be followed by arrow keys.
    e.currentTarget.focus();
    onChange(levelFromClientX(e.clientX));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(Math.min(10, level + 1));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(Math.max(0, level - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(0);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(10);
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <p
          className="font-sans text-[13px] font-semibold"
          style={{ color: "var(--text)" }}
        >
          Pain level <span style={{ color: "var(--red)" }}>*</span>
        </p>
        <p
          className="font-mono text-[32px] font-bold tabular-nums leading-none"
          style={{ color: value === null ? "var(--muted)" : color }}
          data-testid="pain-level-readout"
        >
          {value === null ? "—" : value}
          <span
            className="font-sans text-[14px] font-normal"
            style={{ color: "var(--muted)" }}
          >
            {" "}
            / 10
          </span>
        </p>
      </div>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Pain level, 0 to 10"
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={value ?? 0}
        aria-valuetext={value === null ? "Not set" : `${value} out of 10`}
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
        className="relative flex min-h-11 cursor-pointer items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        style={{
          background: "var(--surface)",
          border: `1px solid ${value === null ? "var(--border)" : color}`,
        }}
      >
        <div
          className="pointer-events-none absolute inset-y-0 left-0 rounded-full transition-[width] duration-150"
          style={{
            width: `${(level / 10) * 100}%`,
            background: `color-mix(in srgb, ${color} 30%, transparent)`,
          }}
        />
        {Array.from({ length: 11 }, (_, i) => i).map((stop) => (
          <div
            key={stop}
            aria-hidden="true"
            className="pointer-events-none relative flex-1 border-l first:border-l-0"
            style={{ borderColor: "var(--border)", height: 10 }}
          />
        ))}
      </div>

      <div className="mt-1 flex justify-between">
        {PAIN_WORD_ANCHORS.map((anchor) => (
          <span
            key={anchor.level}
            className="font-sans text-[10px]"
            style={{ color: "var(--muted)" }}
          >
            {anchor.word}
          </span>
        ))}
      </div>

      {highPain && (
        <p
          className="mt-2 font-sans text-[12px] font-medium"
          style={{ color: "var(--red)" }}
          data-testid="high-pain-caution"
        >
          A pain level this high recommends a medical check.
        </p>
      )}
    </div>
  );
}
