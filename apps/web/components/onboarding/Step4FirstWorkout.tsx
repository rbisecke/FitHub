"use client";

import Link from "next/link";

interface Props {
  onSkip: () => void;
}

export function Step4FirstWorkout({ onSkip }: Props) {
  return (
    <div className="animate-fadeUp flex flex-col">
      <p
        className="font-mono mb-2 text-[13px]"
        style={{ color: "var(--muted)" }}
      >
        $ fithub start
      </p>
      <h2 className="font-heading mb-2 text-[28px] text-[var(--foreground)]">
        How do you want to start?
      </h2>
      <p className="mb-8 text-[14px] text-[var(--muted)]">
        Pick the flow that fits right now. You can use both any time.
      </p>

      {/* Two equal-weight option cards */}
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Option A: git commit */}
        <Link
          href="/log/new"
          className="flex flex-1 flex-col items-start rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-5 text-left transition-colors hover:border-[var(--accent)] active:scale-[0.98]"
          aria-label="Log a full workout session"
        >
          <p
            className="font-mono mb-3 text-[15px] font-bold"
            style={{ color: "var(--accent)" }}
          >
            $ git commit
          </p>
          <p className="font-heading mb-1 text-[17px] text-[var(--foreground)]">
            Log a workout
          </p>
          <p className="mb-5 text-[13px] text-[var(--muted)]">
            Multiple movements, sets, and reps. Full session logging.
          </p>
          <span
            className="mt-auto inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-[13px] font-semibold"
            style={{
              background: "var(--accent)",
              color: "#0A0D12",
            }}
          >
            Log workout &rarr;
          </span>
        </Link>

        {/* Option B: git tag */}
        <Link
          href="/log/tag"
          className="flex flex-1 flex-col items-start rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-5 text-left transition-colors hover:border-[var(--gold)] active:scale-[0.98]"
          aria-label="Tag a personal record or milestone"
        >
          <p
            className="font-mono mb-3 text-[15px] font-bold"
            style={{ color: "var(--gold)" }}
          >
            $ git tag
          </p>
          <p className="font-heading mb-1 text-[17px] text-[var(--foreground)]">
            Tag a PR
          </p>
          <p className="mb-5 text-[13px] text-[var(--muted)]">
            One movement, your best result. Perfect for milestones.
          </p>
          <span
            className="mt-auto inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-[13px] font-semibold"
            style={{
              borderColor: "var(--gold)",
              color: "var(--gold)",
            }}
          >
            Tag a PR &rarr;
          </span>
        </Link>
      </div>

      {/* Skip link */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={onSkip}
          className="inline-flex min-h-[44px] items-center px-4 text-[13px] text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
