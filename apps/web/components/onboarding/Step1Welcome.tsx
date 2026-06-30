"use client";

import { motion, useReducedMotion } from "motion/react";

interface Props {
  onStart: () => void;
  onSkipAll: () => void;
}

export function Step1Welcome({ onStart, onSkipAll }: Props) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className="flex flex-1 flex-col"
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Brand mark */}
      <div className="mb-[28px] flex items-center gap-[13px]">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[13px] bg-[var(--accent)]">
          {/* Git branch icon */}
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0A0D12"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="6" y1="3" x2="6" y2="15" />
            <circle cx="18" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <path d="M18 9a9 9 0 0 1-9 9" />
          </svg>
        </div>
        <span
          className="font-heading text-[26px] text-[var(--foreground)]"
          style={{ letterSpacing: "-0.6px" }}
        >
          FitHub
        </span>
      </div>

      {/* H1 */}
      <h1
        className="font-heading mb-[14px] text-[34px] text-[var(--foreground)]"
        style={{ lineHeight: 1.1, letterSpacing: "-1px" }}
      >
        Your training,
        <br />
        version&#8209;controlled.
      </h1>

      {/* Tagline */}
      <p className="mb-[28px] text-[14px] leading-[1.6] text-[var(--muted)]">
        Every workout is a <span className="text-[var(--accent)]">commit</span>.
        Every PR is a <span className="text-[var(--gold)]">tagged release</span>
        . FitHub tracks your fitness like git tracks code.
      </p>

      {/* Feature list */}
      <div className="mb-[32px] flex flex-col gap-[12px]">
        {/* Commit every session */}
        <div className="flex items-center gap-[13px]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--card)] text-[var(--accent)]">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="4" />
              <line x1="1.05" y1="12" x2="7" y2="12" />
              <line x1="17.01" y1="12" x2="22.96" y2="12" />
            </svg>
          </div>
          <p className="text-[13.5px]">
            <strong className="font-semibold text-[var(--foreground)]">
              Commit every session
            </strong>{" "}
            <span className="text-[var(--muted)]">
              log lifts, metcons &amp; PRs
            </span>
          </p>
        </div>

        {/* Watch your graph grow */}
        <div className="flex items-center gap-[13px]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--card)] text-[var(--gold)]">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <p className="text-[13.5px]">
            <strong className="font-semibold text-[var(--foreground)]">
              Watch your graph grow
            </strong>{" "}
            <span className="text-[var(--muted)]">
              streaks, volume &amp; trends
            </span>
          </p>
        </div>

        {/* Train with an AI coach */}
        <div className="flex items-center gap-[13px]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--card)] text-[var(--purple)]">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <p className="text-[13.5px]">
            <strong className="font-semibold text-[var(--foreground)]">
              Train with an AI coach
            </strong>{" "}
            <span className="text-[var(--muted)]">that knows your history</span>
          </p>
        </div>
      </div>

      {/* CTAs */}
      <div className="mt-auto flex flex-col gap-3">
        <button
          onClick={onStart}
          className="min-h-[48px] w-full rounded-[13px] bg-[var(--accent)] py-[15px] text-[15px] font-extrabold text-[#0A0D12] transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          Start setup
        </button>
        <div className="flex justify-center">
          <button
            onClick={onSkipAll}
            className="font-data inline-flex min-h-[44px] items-center px-4 text-[13px] text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
          >
            Already training here? Sign in
          </button>
        </div>
      </div>
    </motion.div>
  );
}
