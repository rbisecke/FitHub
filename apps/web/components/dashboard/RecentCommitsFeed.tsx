import Link from "next/link";

interface CommitEntry {
  hash: string;
  title: string;
  sessionType: string;
  relTime: string;
  prValue?: string;
}

interface Props {
  commits?: CommitEntry[];
  weekCount?: number;
}

function GitBranchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--muted)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 01-9 9" />
    </svg>
  );
}

export function RecentCommitsFeed({ commits = [], weekCount }: Props) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="font-semibold text-[15px]">Recent commits</span>
        <div className="flex items-center gap-3">
          {weekCount != null && (
            <span className="text-[12px] text-[var(--muted)]">
              {weekCount} this week
            </span>
          )}
          <Link
            href="/history"
            className="text-[12px] text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
          >
            view all →
          </Link>
        </div>
      </div>

      {commits.length === 0 ? (
        <div className="text-[var(--muted)] text-[13px]">
          No sessions logged yet.
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {commits.map((c) => (
            <div
              key={c.hash}
              className="flex gap-3.5 py-3 first:pt-0 last:pb-0"
            >
              {/* Icon container */}
              <div className="w-[30px] h-[30px] rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <GitBranchIcon />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Title row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold truncate">
                    {c.title}
                  </span>
                  {c.prValue && (
                    <span className="text-[11px] font-bold bg-[rgba(255,200,61,0.15)] text-[var(--gold)] border border-[rgba(255,200,61,0.4)] px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                      🏆 PR {c.prValue}
                    </span>
                  )}
                </div>
                {/* Subtitle row */}
                <div className="flex items-center gap-1.5 mt-0.5 font-data text-[11px] text-[var(--muted)]">
                  <span className="text-[var(--gold)]">{c.hash}</span>
                  <span>·</span>
                  <span>{c.relTime}</span>
                  <span>·</span>
                  <span>{c.sessionType}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
