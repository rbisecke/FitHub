"use client";

// Design decision: "Convert cardio →" pre-fills with a prompt prefix so the
// user can add context ("Convert this cardio to machine equivalents: [run 400m]").
// The trailing space is intentional — the cursor lands after it, ready to type.
const SUGGESTIONS = [
  "Review my last week",
  "What should I focus on?",
  "How's my recovery?",
  "Suggest a deload",
  "Analyse my squat volume",
  "Convert cardio →",
];

// Map pill label → text inserted into the chat input.
// Most pills insert themselves verbatim; "Convert cardio →" pre-fills a prompt.
const PILL_PREFILL: Record<string, string> = {
  "Convert cardio →": "Convert this cardio to machine equivalents: ",
};

interface Props {
  onSelect: (text: string) => void;
}

export function SuggestionPills({ onSelect }: Props) {
  return (
    <div className="flex gap-[7px] overflow-x-auto pb-[10px] px-[14px] scrollbar-none flex-shrink-0">
      {SUGGESTIONS.map((s) => (
        <button
          key={s}
          onClick={() => onSelect(PILL_PREFILL[s] ?? s)}
          className="flex-shrink-0 bg-[var(--card)] border border-[var(--border)] rounded-full px-3 py-1.5 text-[11.5px] text-[var(--muted-foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors whitespace-nowrap"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
