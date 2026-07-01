export function CoachHeader() {
  return (
    <div className="bg-[var(--card)] border-b border-[var(--border)] px-[22px] py-[18px] flex items-center gap-4 flex-shrink-0">
      {/* Avatar — rounded square with chat bubble icon */}
      <div
        className="flex items-center justify-center flex-shrink-0 bg-[var(--blue)]"
        style={{ width: 46, height: 46, borderRadius: 12 }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
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
          className="font-heading text-[18px]"
          style={{ letterSpacing: "-0.3px" }}
        >
          Coach
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="w-[7px] h-[7px] rounded-full bg-[var(--accent)]" />
          <span className="text-[12px] text-[var(--muted-foreground)]">
            Online · trained on your history
          </span>
        </div>
      </div>
    </div>
  );
}
