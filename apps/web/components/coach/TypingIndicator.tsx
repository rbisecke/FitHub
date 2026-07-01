"use client";

export function TypingIndicator() {
  return (
    <div
      className="self-start flex items-center gap-1.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-[4px_16px_16px_16px] px-4 py-3.5 w-fit"
      role="status"
      aria-label="Coach is typing"
    >
      <span className="w-[7px] h-[7px] rounded-full bg-[var(--blue)] animate-typing" />
      <span className="w-[7px] h-[7px] rounded-full bg-[var(--blue)] animate-typing-2" />
      <span className="w-[7px] h-[7px] rounded-full bg-[var(--blue)] animate-typing-3" />
    </div>
  );
}
