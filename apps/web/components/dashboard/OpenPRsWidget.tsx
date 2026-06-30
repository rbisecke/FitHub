import Link from "next/link";

interface PRItem {
  category: string;
  name: string;
  value: string;
  improvement?: string;
}

interface Props {
  prs?: PRItem[];
}

export function OpenPRsWidget({ prs = [] }: Props) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
      <div className="font-semibold text-[15px] mb-0.5">Open PRs</div>
      <div className="text-[12px] text-[var(--muted)] mb-4">
        recent records worth reviewing
      </div>

      {prs.length === 0 ? (
        <div className="text-[13px] text-[var(--muted)]">
          No PRs yet — log your first result.
        </div>
      ) : (
        <div className="space-y-3">
          {prs.map((pr) => (
            <div key={pr.name} className="flex items-center gap-3">
              <span className="text-[10px] font-bold bg-[rgba(255,200,61,0.14)] text-[var(--gold)] border border-[rgba(255,200,61,0.3)] px-2 py-0.5 rounded-full flex-shrink-0">
                {pr.category}
              </span>
              <span className="text-[13px] font-semibold flex-1 truncate">
                {pr.name}
              </span>
              <span className="font-heading text-[18px] text-[var(--gold)]">
                {pr.value}
              </span>
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
