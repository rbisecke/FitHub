export function CoachHeader() {
  return (
    <div className="bg-[var(--card)] border-b border-[var(--border)] px-[22px] py-[18px] flex items-center gap-4 flex-shrink-0">
      {/* Avatar */}
      <div className="w-[46px] h-[46px] rounded-full bg-[var(--blue)] flex items-center justify-center flex-shrink-0">
        <span className="font-heading text-[16px] text-[#0A0D12]">FH</span>
      </div>
      {/* Identity */}
      <div>
        <div className="font-bold text-[15px] text-[var(--foreground)]">
          AI Coach
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
