import Link from "next/link";

export function CoachPreviewCard() {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-[var(--blue)] flex items-center justify-center flex-shrink-0">
          <span className="font-heading text-[14px] text-[#0d1117]">FH</span>
        </div>
        <div>
          <div className="font-bold text-[13px]">Your AI Coach</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <span className="text-[11px] text-[var(--muted)]">Online</span>
          </div>
        </div>
      </div>
      <p className="text-[12px] text-[var(--muted)] line-clamp-2 mb-3">
        Ready to review your recent sessions and suggest this week&apos;s focus.
      </p>
      <Link
        href="/coach"
        className="text-[12px] font-bold text-[var(--accent)] hover:brightness-110 transition-all"
      >
        Start chatting →
      </Link>
    </div>
  );
}
