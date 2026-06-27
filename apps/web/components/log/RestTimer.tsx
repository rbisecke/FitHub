"use client";

import { formatTime } from "@/lib/time";

interface RestTimerProps {
  remaining: number;
  onSkip: () => void;
}

export function RestTimer({ remaining, onSkip }: RestTimerProps) {
  if (remaining <= 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Rest timer: ${formatTime(remaining)} remaining`}
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+64px)] md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-full border border-[#30363d] bg-[#161b22] px-5 py-2.5 shadow-lg"
    >
      <span className="font-mono text-xs text-[#8b949e] uppercase tracking-widest">
        Rest
      </span>
      <span className="font-mono text-xl tabular-nums text-[#e6edf3]">
        {formatTime(remaining)}
      </span>
      <button
        type="button"
        onClick={onSkip}
        className="font-mono text-xs text-[#58a6ff] hover:text-[#e6edf3] transition-colors min-h-[32px] px-2"
        aria-label="Skip rest"
      >
        Skip ▶
      </button>
    </div>
  );
}
