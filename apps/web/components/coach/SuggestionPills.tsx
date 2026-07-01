"use client";

const SUGGESTIONS = [
  "Review my last week",
  "What should I focus on?",
  "How's my recovery?",
  "Suggest a deload",
  "Analyse my squat volume",
];

interface Props {
  onSelect: (text: string) => void;
}

export function SuggestionPills({ onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto py-3 px-[22px] scrollbar-none flex-shrink-0">
      {SUGGESTIONS.map((s) => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          className="flex-shrink-0 bg-[var(--card)] border border-[var(--border)] rounded-full px-3 py-1.5 text-[11.5px] text-[var(--muted-foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors whitespace-nowrap"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
