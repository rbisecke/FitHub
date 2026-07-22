"use client";

import { useEffect, useRef, useState } from "react";
import { m, useReducedMotion } from "motion/react";
import { Snowflake } from "lucide-react";
import { MotionProvider } from "@/components/shared/motion-provider";
import { FlameGlyph } from "@/components/gamification/FlameGlyph";

/**
 * The streak-freeze consumption reveal (07 §F) — "the single most designed
 * animation in this domain." Fires once per real freeze-consumption event
 * (guarded by the caller — see GamificationMount) on dashboard/Today load.
 *
 * Four beats, ≤1.3s total, standard easing except the Beat 3 numeral spring:
 *   1. Ice shell forms around the frost-blue flame (300ms ease-out).
 *   2. Shell shatters into ≤12 short-throw shards, ≤40px travel, fades to 0
 *      by 400ms — a contained directional break, never a radial/confetti burst.
 *   3. Flame recolors frost -> flame-orange (250ms) while the streak numeral
 *      settles with a single-overshoot spring (stiffness 180, damping 20).
 *   4. A small graph strip slides up (300ms) showing the covered week in
 *      frost, then the "Got it" control arrives last.
 *
 * `prefers-reduced-motion` collapses the whole sequence to one static,
 * already-resolved card — an equally-valid state, not a degraded one.
 */

type Beat = "beat1" | "beat2" | "beat3" | "beat4" | "static";

interface Shard {
  dx: number;
  dy: number;
  delay: number;
  rotate: number;
}

// A single contained "break direction" (up, ±30°), not a radial burst — each
// shard gets a slightly different deviation off that vector and a
// capped-at-40px travel distance (07 §F Beat 2). Fixed rather than
// `Math.random()`-generated: it's a purely decorative visual, so a
// deterministic set avoids re-rolling on every render (and the
// impure-during-render pitfall that comes with generating it there).
const SHARDS: readonly Shard[] = [
  { dx: -14, dy: -34, delay: 0, rotate: -40 },
  { dx: 6, dy: -38, delay: 0.02, rotate: 30 },
  { dx: -26, dy: -22, delay: 0.05, rotate: -70 },
  { dx: 18, dy: -30, delay: 0.01, rotate: 60 },
  { dx: -4, dy: -40, delay: 0.06, rotate: 10 },
  { dx: 24, dy: -18, delay: 0.03, rotate: 80 },
  { dx: -20, dy: -30, delay: 0.08, rotate: -20 },
  { dx: 10, dy: -22, delay: 0.04, rotate: 45 },
  { dx: -10, dy: -18, delay: 0.09, rotate: -55 },
  { dx: 2, dy: -28, delay: 0.07, rotate: 15 },
];

function formatWeekLabel(weekKey: string | undefined): string {
  if (!weekKey) return "last week";
  const parts = weekKey.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return "last week";
  }
  const [y, mo, d] = parts as [number, number, number];
  const date = new Date(y, mo - 1, d);
  return `Week of ${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;
}

interface FreezeRevealProps {
  currentStreak: number;
  freezesRemaining: number;
  coveredWeekKey: string | undefined;
  onDismiss: () => void;
}

function FreezeRevealInner({
  currentStreak,
  freezesRemaining,
  coveredWeekKey,
  onDismiss,
}: FreezeRevealProps) {
  const prefersReducedMotion = useReducedMotion();
  const [beat, setBeat] = useState<Beat>(
    prefersReducedMotion ? "static" : "beat1",
  );
  const gotItRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const t2 = setTimeout(() => setBeat("beat2"), 300);
    const t3 = setTimeout(() => setBeat("beat3"), 300 + 400);
    const t4 = setTimeout(() => setBeat("beat4"), 300 + 400 + 250);
    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (beat === "beat4" || beat === "static") {
      gotItRef.current?.focus();
    }
  }, [beat]);

  // Focus management + body scroll lock, mirroring SheetOverlay's modal
  // pattern: move focus into the dialog on mount (the panel itself, since
  // Beats 1-3 have no focusable control yet — "Got it" claims focus once it
  // arrives via the effect above), trap Tab inside it, allow Escape to
  // dismiss at any beat, and restore focus/scroll on unmount.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusId = requestAnimationFrame(() => panelRef.current?.focus());

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDismiss();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        e.preventDefault(); // no focusable control yet — keep focus pinned to the panel
        return;
      }
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(focusId);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onDismiss]);

  const resolved = beat === "beat3" || beat === "beat4" || beat === "static";
  const showIceShell = beat === "beat1" || beat === "beat2";
  const showShards = beat === "beat2";
  // Beat 3 brings the "1 freeze used" line in alongside the recolor/spring;
  // the graph strip + "Got it" control are Beat 4's arrival, one beat later
  // (07 §F — these are two distinct beats, not one combined reveal).
  const showMessage = resolved;
  const showDetail = beat === "beat4" || beat === "static";
  const flameColor = resolved ? "var(--flame)" : "var(--frost)";

  const streakCells = Math.min(Math.max(currentStreak, 1), 6);
  const weekLabel = formatWeekLabel(coveredWeekKey);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Streak freeze applied"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg)]/90 px-5 backdrop-blur-sm"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="flex w-full max-w-sm flex-col items-center gap-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-8 outline-none"
        style={{ boxShadow: "var(--shadow-overlay)" }}
      >
        <div className="relative flex size-24 items-center justify-center">
          {showIceShell && (
            <m.div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in srgb, var(--frost) 40%, transparent) 0%, transparent 72%)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: beat === "beat1" ? 1 : 0 }}
              transition={{
                duration: beat === "beat1" ? 0.3 : 0.4,
                ease: [0.2, 0, 0, 1],
              }}
            />
          )}

          {showShards &&
            SHARDS.map((s, i) => (
              <m.span
                key={i}
                aria-hidden="true"
                className="absolute size-1.5 rounded-[2px]"
                style={{ background: "var(--frost)" }}
                initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                animate={{
                  x: s.dx,
                  y: s.dy,
                  opacity: 0,
                  rotate: s.rotate,
                }}
                transition={{
                  duration: 0.35,
                  delay: s.delay,
                  ease: [0.2, 0, 0, 1],
                }}
              />
            ))}

          <span
            className="relative z-10 flex size-14 items-center justify-center"
            style={{
              color: flameColor,
              transition: prefersReducedMotion
                ? "none"
                : "color 250ms var(--ease-standard)",
            }}
          >
            <FlameGlyph className="size-full" />
          </span>
        </div>

        <div className="flex flex-col items-center gap-1 text-center">
          <m.span
            key={resolved ? "settled" : "frozen"}
            initial={
              !prefersReducedMotion && beat === "beat3"
                ? { scale: 0.85 }
                : false
            }
            animate={{ scale: 1 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 180, damping: 20 }
            }
            className="font-mono text-4xl font-bold tabular-nums text-[var(--text)]"
          >
            {currentStreak}
          </m.span>
          <span className="font-sans text-xs text-[var(--muted)]">
            {currentStreak === 1 ? "week streak" : "weeks streak"}
          </span>

          {showMessage && (
            <p
              aria-live="polite"
              className="mt-3 font-sans text-sm text-[var(--text)]"
            >
              1 freeze used · {freezesRemaining} remaining
            </p>
          )}
        </div>

        {showDetail && (
          <m.div
            className="flex w-full flex-col items-center gap-3"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.3, ease: [0.2, 0, 0, 1] }
            }
          >
            <div className="flex items-center gap-1.5">
              {Array.from({ length: streakCells }, (_, i) => {
                const isCovered = i === streakCells - 1;
                return (
                  <span
                    key={i}
                    className="flex size-5 items-center justify-center rounded-[2px]"
                    style={{
                      // Matches ContributionGraph's "logged" cell token
                      // exactly (--cyan) — the two surfaces render the same
                      // semantic and a 2026-07-18 spec correction requires
                      // an exact match, not merely a similar hue.
                      background: isCovered ? "var(--frost)" : "var(--cyan)",
                    }}
                    title={isCovered ? weekLabel : undefined}
                  >
                    {isCovered && (
                      <Snowflake
                        className="size-3"
                        style={{ color: "var(--bg)" }}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                );
              })}
            </div>
            <p className="font-mono text-[11px] text-[var(--muted)]">
              {weekLabel} — protected
            </p>

            <button
              ref={gotItRef}
              type="button"
              onClick={onDismiss}
              className="mt-1 w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 font-sans text-sm font-semibold text-[var(--bg)] transition-opacity hover:opacity-90"
              style={{ minHeight: "44px" }}
            >
              Got it
            </button>
          </m.div>
        )}
      </div>
    </div>
  );
}

export function FreezeReveal(props: FreezeRevealProps) {
  return (
    <MotionProvider>
      <FreezeRevealInner {...props} />
    </MotionProvider>
  );
}
