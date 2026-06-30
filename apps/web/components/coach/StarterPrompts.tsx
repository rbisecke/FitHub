"use client";

// Empty state shown when there are no messages in the chat session.
// Suggestion pills are rendered separately via SuggestionPills below the scroll area.
export function StarterPrompts() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-12 text-center px-6">
      <div className="w-16 h-16 rounded-full bg-[var(--blue)] flex items-center justify-center mb-4">
        <span className="font-heading text-[22px] text-[#0A0D12]">FH</span>
      </div>
      <div className="font-heading text-[22px] text-[var(--foreground)] mb-2">
        Your AI Coach
      </div>
      <p className="text-[14px] text-[var(--muted-foreground)] max-w-[300px] leading-relaxed">
        Trained on your training history. Ask about recovery, volume, or what to
        focus on next.
      </p>
    </div>
  );
}
