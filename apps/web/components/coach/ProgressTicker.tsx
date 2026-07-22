"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

/**
 * Pre-token progress ticker (design-spec 03 §2) — the honest 3-step sequence of
 * real backend work between "user sent" and the first token: "Checking your
 * plan & injuries → Retrieving coaching notes → Answering." Monochrome (transient
 * states never carry color, style-feedback recommendation 6).
 *
 * The backend streams raw tokens with no discrete step-completion events, so
 * there is no real signal for exactly which step is active — the steps advance
 * on a fixed timer as a good-faith visual approximation of the retrieval →
 * generation pipeline, not a literal progress report. It freezes the moment the
 * first token arrives (the caller flips `phase` to "settled").
 *
 * Per Open Item 8 (CONFIRMED, not still open): collapsible-but-persists-after-
 * completion as a small "show reasoning" toggle — not always-expanded, not
 * always-hidden.
 */
const STEPS = [
  "Checking your plan & injuries",
  "Retrieving coaching notes",
  "Answering",
];

const STEP_INTERVAL_MS = 650;

export function ProgressTicker({ phase }: { phase: "thinking" | "settled" }) {
  const [activeStep, setActiveStep] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (phase !== "thinking") return undefined;
    let cancelled = false;
    // Deferred to a microtask — satisfies react-hooks/set-state-in-effect.
    void Promise.resolve().then(() => {
      if (!cancelled) setActiveStep(0);
    });
    const id = setInterval(() => {
      setActiveStep((s) => Math.min(s + 1, STEPS.length - 1));
    }, STEP_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [phase]);

  if (phase === "thinking") {
    return (
      <div data-testid="coach-progress-ticker">
        <span className="sr-only">Thinking…</span>
        <div aria-hidden="true" className="flex flex-col gap-1">
          {STEPS.map((step, i) => (
            <p
              key={step}
              className="font-mono text-[12px] transition-opacity duration-standard"
              style={{
                color: i <= activeStep ? "var(--muted)" : "var(--border)",
                opacity: i <= activeStep ? 1 : 0.5,
              }}
            >
              {i < activeStep ? "✓" : i === activeStep ? "…" : "·"} {step}
            </p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="coach-progress-ticker-settled">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-label="Toggle what the coach checked for this answer"
        className="flex min-h-6 items-center gap-1 font-mono text-[11px] text-[var(--muted)] transition-colors hover:text-[var(--text)]"
      >
        {expanded ? (
          <ChevronDown size={12} aria-hidden="true" />
        ) : (
          <ChevronRight size={12} aria-hidden="true" />
        )}
        Show reasoning
      </button>
      {expanded && (
        <div className="mt-1 flex flex-col gap-0.5 pl-4">
          {STEPS.map((step) => (
            <p key={step} className="font-mono text-[11px] text-[var(--muted)]">
              ✓ {step}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
