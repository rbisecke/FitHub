import Link from "next/link";

interface CommitEntry {
  hash: string;
  title: string;
  sessionType: string;
  relTime: string;
  hasPR?: boolean;
}

interface Props {
  commits?: CommitEntry[];
}

export function RecentCommitsFeed({ commits = [] }: Props) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="font-semibold text-[15px]">Recent commits</span>
        <Link
          href="/history"
          className="text-[12px] text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
        >
          view all →
        </Link>
      </div>

      {commits.length === 0 ? (
        <div className="text-[var(--muted)] text-[13px]">
          No sessions logged yet.
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[3px] top-4 bottom-4 w-0.5 bg-[var(--border)]" />
          <div className="space-y-3 pl-[22px]">
            {commits.map((c) => (
              <div key={c.hash} className="relative flex items-center gap-3">
                <span
                  className={
                    "absolute -left-[19px] w-2 h-2 rounded-full border-2 border-[var(--background)] " +
                    (c.hasPR ? "bg-[var(--gold)]" : "bg-[var(--border)]")
                  }
                />
                <span className="font-data text-[12px] text-[var(--gold)] font-semibold flex-shrink-0">
                  {c.hash}
                </span>
                <span className="text-[13px] font-semibold truncate flex-1">
                  {c.title}
                </span>
                <span className="text-[10px] bg-[rgba(74,222,128,0.12)] border border-[rgba(74,222,128,0.3)] text-[var(--accent)] px-2 py-0.5 rounded-full flex-shrink-0">
                  {c.sessionType}
                </span>
                <span className="text-[11px] text-[var(--muted)] flex-shrink-0">
                  {c.relTime}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
