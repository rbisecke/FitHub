"use client";

const STARTER_PROMPTS = [
  "Analyze my last month of training",
  "What should I work on next?",
  "Help me plan a deload week",
  "Can I attempt a PR this week?",
];

interface StarterPromptsProps {
  onSelect: (prompt: string) => void;
}

export function StarterPrompts({ onSelect }: StarterPromptsProps) {
  return (
    <div className="flex flex-col gap-4 py-8 px-2">
      <div>
        <p className="font-mono text-xs text-[--muted]">$ git coach --help</p>
        <p className="font-mono text-xs text-[--muted] mt-1">
          # click a prompt or ask anything about your training
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSelect(prompt)}
            className="rounded-md border border-[--border] bg-[--surface] px-3 py-3 min-h-[44px] flex items-center text-left font-mono text-xs text-[--muted] hover:border-[--accent] hover:text-[--text] transition-colors duration-100"
          >
            &ldquo;{prompt}&rdquo;
          </button>
        ))}
      </div>
    </div>
  );
}
