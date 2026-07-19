"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";

interface Props {
  token: string;
  onSkip: () => void;
}

// Both action cards exit onboarding entirely rather than advancing to the
// summary step, so they set onboarding_completed:true (best-effort — the
// navigation is never blocked on the patch) before routing out, matching the
// step-1 skip-all mechanism. Only "Skip for now" stays in the wizard.
export function Step7FirstAction({ token, onSkip }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<"log" | "tag" | null>(null);

  async function goTo(dest: "log" | "tag") {
    setPending(dest);
    try {
      await api.profile.patch(token, { onboarding_completed: true });
    } catch {
      // best-effort — never block the exit on this patch
    }
    router.push(dest === "log" ? "/log/new" : "/log/tag");
  }

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
        <button
          type="button"
          onClick={() => goTo("log")}
          disabled={pending !== null}
          className="flex flex-1 flex-col items-start rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-5 text-left transition-colors hover:border-[var(--accent)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          aria-label="Log a full workout session"
          aria-busy={pending === "log"}
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
              color: "var(--bg)",
            }}
          >
            {pending === "log" ? "Loading…" : "Log workout →"}
          </span>
        </button>

        {/* Option B: git tag */}
        <button
          type="button"
          onClick={() => goTo("tag")}
          disabled={pending !== null}
          className="flex flex-1 flex-col items-start rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-5 text-left transition-colors hover:border-[var(--gold)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          aria-label="Tag a personal record or milestone"
          aria-busy={pending === "tag"}
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
            {pending === "tag" ? "Loading…" : "Tag a PR →"}
          </span>
        </button>
      </div>

      {/* Skip link */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={onSkip}
          disabled={pending !== null}
          className="inline-flex min-h-[44px] items-center px-4 text-[13px] text-[var(--muted)] transition-colors hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
