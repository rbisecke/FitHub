interface CommitLine {
  hash: string;
  message: string;
}

interface Props {
  commits?: CommitLine[];
}

export function TerminalWidget({ commits = [] }: Props) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
      {/* macOS-style title bar */}
      <div className="bg-[var(--surface-2)] px-3.5 py-2.5 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
        <span className="ml-6 font-data text-[12px] text-[var(--muted)]">
          ~/fithub
        </span>
      </div>

      {/* Terminal body */}
      <div className="p-[16px_18px] font-data text-[12.5px] leading-relaxed">
        <div className="text-[var(--muted)]">$ git log --oneline -5</div>
        {commits.map((c) => (
          <div key={c.hash} className="flex gap-2.5">
            <span className="text-[var(--gold)] flex-shrink-0">{c.hash}</span>
            <span className="text-[var(--foreground)]">{c.message}</span>
          </div>
        ))}
        {commits.length === 0 && (
          <div className="text-[var(--muted)]">
            No commits yet — start training.
          </div>
        )}
        <div className="text-[var(--accent)] mt-1">
          <span>$ </span>
          <span className="animate-blink">▌</span>
        </div>
      </div>
    </div>
  );
}
