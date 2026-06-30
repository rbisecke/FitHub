"use client";

import { useState } from "react";

interface Suggestion {
  id: string;
  title: string;
  body: string;
}

const STUB_SUGGESTIONS: Suggestion[] = [
  {
    id: "1",
    title: "Reduce squat volume by 15%",
    body: "Your ACWR trend suggests accumulated fatigue over the past 10 days. Pulling back on lower-body volume this week will keep adaptation on track.",
  },
  {
    id: "2",
    title: "Add an active recovery day",
    body: "Session RPE data shows back-to-back high-intensity days on Wednesday and Thursday. Inserting a light aerobic session between them improves recovery quality.",
  },
  {
    id: "3",
    title: "Advance deload by one week",
    body: "PRs have stalled across three consecutive strength sessions — a typical sign of accumulated fatigue. An early deload now protects the next mesocycle's gains.",
  },
];

export function AIAdaptationsPanel() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = STUB_SUGGESTIONS.filter((s) => !dismissed.has(s.id));

  function dismiss(id: string) {
    setDismissed((prev) => new Set([...prev, id]));
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 animate-fadeUp">
      <div className="flex items-center gap-3 mb-4">
        <div>
          <span className="font-heading text-[15px] text-[var(--foreground)]">
            AI Adaptations
          </span>
          <span className="font-data text-[11px] text-[var(--accent)] ml-2">
            $ git suggest
          </span>
        </div>
        <span className="ml-auto text-[10px] font-bold text-[var(--blue)] bg-[rgba(88,166,255,0.12)] border border-[rgba(88,166,255,0.3)] px-2 py-0.5 rounded-full flex-shrink-0">
          AI
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="font-data text-[13px] text-[var(--muted)] text-center py-4">
          # no adaptations proposed — plan looks good
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((s) => (
            <div
              key={s.id}
              className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3.5"
            >
              <div className="flex items-start gap-2 mb-1.5">
                <span className="text-[var(--accent)] text-[14px] flex-shrink-0 mt-0.5">
                  💡
                </span>
                <span className="font-sans text-[14px] font-bold text-[var(--foreground)] leading-snug">
                  {s.title}
                </span>
              </div>
              <p className="font-sans text-[12.5px] text-[var(--muted)] leading-relaxed mb-3">
                {s.body}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => dismiss(s.id)}
                  className="font-data text-[11px] text-[var(--accent)] border border-[rgba(74,222,128,0.4)] px-3 py-1 rounded-full hover:bg-[rgba(74,222,128,0.08)] transition-colors"
                >
                  Apply
                </button>
                <button
                  onClick={() => dismiss(s.id)}
                  className="font-data text-[11px] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors px-2 py-1"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
