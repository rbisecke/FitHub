"use client";

import { useEffect, useRef } from "react";
import type { WizardState } from "@/lib/types/plans";

/**
 * Async plan generation state (02 §3). Replaces the wizard entirely once
 * submit fires — a scoped, dark, "AI is building" view with discrete named
 * states (never a fake percentage) and honest failure/rate-limit/timeout
 * treatments. Also reflects status in the browser tab title so an athlete
 * who tabs away still gets a passive signal (Vercel's favicon/tab-status
 * pattern, git research §7).
 */
export function PlanGenerationScreen({
  state,
  onRetry,
}: {
  state: WizardState;
  onRetry: () => void;
}) {
  const originalTitleRef = useRef<string | null>(null);

  useEffect(() => {
    if (originalTitleRef.current === null) {
      originalTitleRef.current = document.title;
    }
    const original = originalTitleRef.current;

    if (state.error) {
      document.title = "Failed — FitHub";
    } else if (state.rateLimited) {
      document.title = "Try again shortly — FitHub";
    } else if (state.timedOut) {
      document.title = "Timed out — FitHub";
    } else if (state.taskStatus === "pending") {
      document.title = "Queued… — FitHub";
    } else if (state.taskStatus === "running") {
      document.title = "Building your plan… — FitHub";
    } else if (state.taskStatus === "complete") {
      document.title = "Plan ready — FitHub";
    } else {
      document.title = original;
    }

    return () => {
      document.title = original;
    };
  }, [state.error, state.rateLimited, state.timedOut, state.taskStatus]);

  // ── Failed ────────────────────────────────────────────────────────────
  if (state.error) {
    return (
      <Centered>
        <StatusGlyph tone="red">✕</StatusGlyph>
        <h1 className="font-mono text-lg font-semibold text-[var(--text)]">
          Plan generation failed
        </h1>
        <p className="max-w-sm text-center font-mono text-sm text-[var(--muted)]">
          {state.error}
        </p>
        <RetryButton onClick={onRetry} />
      </Centered>
    );
  }

  // ── Rate-limited (429) ───────────────────────────────────────────────
  if (state.rateLimited) {
    return (
      <Centered>
        <StatusGlyph tone="amber">⏳</StatusGlyph>
        <h1 className="font-mono text-lg font-semibold text-[var(--text)]">
          Slow down a moment
        </h1>
        <p className="max-w-sm text-center font-mono text-sm text-[var(--muted)]">
          You&apos;ve generated a plan several times recently — try again
          shortly.
        </p>
        <RetryButton onClick={onRetry} label="back to wizard" />
      </Centered>
    );
  }

  // ── Client timeout (12th poll, no terminal state) ───────────────────
  if (state.timedOut) {
    return (
      <Centered>
        <StatusGlyph tone="amber">⏳</StatusGlyph>
        <h1 className="font-mono text-lg font-semibold text-[var(--text)]">
          Plan generation timed out
        </h1>
        <p className="max-w-sm text-center font-mono text-sm text-[var(--muted)]">
          The plan may still finish in the background — check your plans
          shortly.
        </p>
        <RetryButton onClick={onRetry} />
      </Centered>
    );
  }

  // ── Queued / building (default while isSubmitting) ──────────────────
  const label =
    state.taskStatus === "pending" || state.taskStatus === null
      ? "Queued"
      : "Building your plan…";

  return (
    <Centered>
      <Spinner />
      <h1
        className="font-mono text-lg font-semibold text-[var(--text)]"
        aria-live="polite"
      >
        {label}
      </h1>
      <p className="max-w-sm text-center font-mono text-sm text-[var(--muted)]">
        Laying out your mesocycles…
      </p>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6"
      data-testid="plan-generation-screen"
    >
      {children}
    </div>
  );
}

function StatusGlyph({
  tone,
  children,
}: {
  tone: "red" | "amber";
  children: React.ReactNode;
}) {
  const color = tone === "red" ? "var(--red)" : "var(--amber)";
  return (
    <div
      aria-hidden="true"
      className="flex h-12 w-12 items-center justify-center rounded-full font-mono text-xl"
      style={{
        color,
        border: `2px solid ${color}`,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
      }}
    >
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      style={{ animation: "spin 1.1s linear infinite" }}
      className="motion-reduce:animate-none"
    >
      <circle
        cx="20"
        cy="20"
        r="17"
        stroke="var(--border)"
        strokeWidth="4"
        fill="none"
      />
      <circle
        cx="20"
        cy="20"
        r="17"
        stroke="var(--accent)"
        strokeWidth="4"
        strokeDasharray="80"
        strokeDashoffset="55"
        strokeLinecap="round"
        fill="none"
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

function RetryButton({
  onClick,
  label = "try again",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      data-testid="generation-retry-btn"
      onClick={onClick}
      className="rounded font-mono text-sm font-semibold"
      style={{
        backgroundColor: "var(--accent)",
        color: "var(--bg)",
        padding: "10px 24px",
        minHeight: "44px",
        border: "none",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
