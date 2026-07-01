import Link from "next/link";

interface GoalItem {
  name: string;
  branch: string;
  progressPct: number;
  currentValue: string;
  targetValue: string;
  gapText: string;
  color: "accent" | "blue" | "hot";
}

interface Props {
  goals?: GoalItem[];
}

const colorMap = {
  accent: "var(--accent)",
  blue: "var(--blue)",
  hot: "var(--hot)",
};

function GitMergeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--accent)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M6 21V9a9 9 0 009 9" />
    </svg>
  );
}

export function OpenPRsWidget({ goals = [] }: Props) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-0.5">
        <GitMergeIcon />
        <span className="font-semibold text-[15px]">Open PRs</span>
      </div>
      <div className="text-[12px] text-[var(--muted)] mb-4">
        Goals you&apos;re working to merge
      </div>

      {goals.length === 0 ? (
        <div className="text-[13px] text-[var(--muted)]">
          No active goals — keep training to unlock.
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((g) => (
            <div key={g.name}>
              {/* Name + percentage */}
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-semibold text-[13px]">{g.name}</span>
                <span
                  className="font-data text-[11px] font-bold"
                  style={{ color: colorMap[g.color] }}
                >
                  {g.progressPct}%
                </span>
              </div>
              {/* Branch name */}
              <div className="font-data text-[10.5px] text-[var(--purple)] mb-1.5">
                ⎇ {g.branch}
              </div>
              {/* Progress bar */}
              <div className="h-[6px] bg-[var(--surface-2)] rounded-full overflow-hidden mb-1.5">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(g.progressPct, 100)}%`,
                    background: colorMap[g.color],
                  }}
                />
              </div>
              {/* Gap text */}
              <div className="font-data text-[10.5px] text-[var(--muted)]">
                {g.gapText}
              </div>
            </div>
          ))}
        </div>
      )}

      <Link
        href="/records"
        className="block text-[12px] text-[var(--muted)] hover:text-[var(--accent)] transition-colors mt-4"
      >
        See all records →
      </Link>
    </div>
  );
}
