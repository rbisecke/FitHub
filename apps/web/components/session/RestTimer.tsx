"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

interface RestTimerProps {
  secondsLeft: number;
  totalSeconds: number;
  paused: boolean;
  onTick: (secondsLeft: number) => void;
  onComplete: () => void;
  onSkip: () => void;
  onTogglePause: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function RestTimer({
  secondsLeft,
  totalSeconds,
  paused,
  onTick,
  onComplete,
  onSkip,
  onTogglePause,
}: RestTimerProps) {
  const prefersReducedMotion = useReducedMotion();

  // S3 — anchor the countdown to a wall-clock target timestamp computed once
  // per mount (a fresh rest period always remounts this component — see
  // SessionExecutionView's AnimatePresence keying) instead of re-deriving
  // from secondsLeft each tick. The previous version depended on
  // [secondsLeft, paused, onTick], so every tick tore down and recreated the
  // interval — each cycle actually took 1000ms + render overhead, drifting
  // measurably over a multi-minute rest.
  //
  // targetRef starts null (pure at render time — Date.now() is only ever
  // called inside the effect below, both for the initial mount anchor and
  // for a pause→resume re-anchor) rather than computed inline in useRef's
  // initializer, which React's purity rules disallow.
  const targetRef = useRef<number | null>(null);
  // Tracks whether the *previous* render was paused, so a pause→resume
  // transition re-anchors the target from the retained secondsLeft instead
  // of reusing the stale mount-time target.
  const wasPausedRef = useRef(paused);

  useEffect(() => {
    if (paused) {
      wasPausedRef.current = true;
      return;
    }
    if (targetRef.current === null || wasPausedRef.current) {
      targetRef.current = Date.now() + secondsLeft * 1000;
      wasPausedRef.current = false;
    }

    const id = setInterval(() => {
      if (targetRef.current === null) return;
      const remaining = Math.round((targetRef.current - Date.now()) / 1000);
      onTick(Math.max(0, remaining));
    }, 1000);

    return () => clearInterval(id);
    // secondsLeft intentionally omitted — the interval must not be recreated
    // every tick. It's only read on entry to this effect (mount, or a
    // pause→resume transition), both handled above via targetRef/wasPausedRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, onTick]);

  // Auto-complete when timer hits 0
  useEffect(() => {
    if (secondsLeft === 0) {
      onComplete();
    }
  }, [secondsLeft, onComplete]);

  // SVG ring math
  const size = 200;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-5">
      {/* Header label */}
      <p className="font-data text-[11px] text-[var(--accent)] uppercase tracking-widest">
        $ rest --timer
      </p>

      {/* SVG ring + countdown */}
      <div className="relative flex items-center justify-center">
        <svg
          width={size}
          height={size}
          role="img"
          aria-label={`Rest timer: ${formatTime(secondsLeft)} remaining`}
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{
              transition: prefersReducedMotion
                ? "none"
                : "stroke-dashoffset 1s linear",
            }}
            className="motion-reduce:transition-none"
          />
        </svg>

        {/* Timer countdown centered in ring */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span
            className="font-heading tabular-nums text-[var(--text)]"
            style={{ fontSize: "clamp(48px, 12vw, 72px)", lineHeight: 1 }}
            aria-live="off"
          >
            {formatTime(secondsLeft)}
          </span>
          <span className="font-sans text-[12px] text-[var(--muted)]">
            {paused ? "paused" : "rest"}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3 w-full max-w-[280px]">
        <button
          onClick={onTogglePause}
          className="flex-1 min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--surface)] font-sans text-[14px] text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          aria-label={paused ? "Resume rest timer" : "Pause rest timer"}
        >
          {paused ? "resume" : "pause"}
        </button>
        <button
          onClick={onSkip}
          className="flex-1 min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--surface)] font-sans text-[14px] text-[var(--muted)] transition-colors hover:text-[var(--text)]"
          aria-label="Skip rest and continue to next set"
        >
          skip rest
        </button>
      </div>

      {/* Subtle hint */}
      <p className="font-sans text-[11px] text-[var(--muted)] text-center">
        tap skip to go straight to next set
      </p>
    </div>
  );
}
