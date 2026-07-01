export function CoachHeader() {
  return (
    <div className="bg-[var(--card)] border-b border-[var(--border)] px-[18px] py-[14px] flex items-center gap-[11px] flex-shrink-0">
      {/* Avatar — rounded square with chat bubble icon */}
      <div
        className="flex items-center justify-center flex-shrink-0 bg-[var(--blue)]"
        style={{ width: 40, height: 40, borderRadius: 11 }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0d1117"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 11.5a8.4 8.4 0 01-9 8.4L3 21l1.2-4.2A8.4 8.4 0 1121 11.5z" />
        </svg>
      </div>
      {/* Identity */}
      <div>
        <div
          className="font-heading text-[16px]"
          style={{ letterSpacing: "-0.3px" }}
        >
          Coach
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="w-[6px] h-[6px] rounded-full bg-[var(--accent)]" />
          <span className="text-[11px] text-[var(--muted-foreground)]">
            Online · trained on your history
          </span>
        </div>
      </div>
    </div>
  );
}
