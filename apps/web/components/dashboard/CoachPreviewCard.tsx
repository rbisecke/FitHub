import Link from "next/link";

function ChatBubbleIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 11.5a8.4 8.4 0 01-9 8.4L3 21l1.2-4.2A8.4 8.4 0 1121 11.5z" />
    </svg>
  );
}

export function CoachPreviewCard() {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        {/* Rounded-square icon with chat bubble */}
        <div className="w-[38px] h-[38px] rounded-[12px] bg-[var(--blue)] flex items-center justify-center flex-shrink-0">
          <ChatBubbleIcon />
        </div>
        <div>
          <div className="font-bold text-[14px]">Coach</div>
          <div className="text-[11px] text-[var(--muted)] mt-0.5">
            AI · knows your history
          </div>
        </div>
      </div>

      <p className="text-[12px] text-[var(--muted)] line-clamp-2 mb-4">
        Ready to review your recent sessions and suggest this week&apos;s focus.
      </p>

      {/* Full-width solid button */}
      <Link
        href="/coach"
        className="block w-full bg-[var(--foreground)] text-[#0A0D12] font-bold text-[13px] text-center py-2.5 rounded-[10px] hover:brightness-95 transition-all"
      >
        Open chat →
      </Link>
    </div>
  );
}
