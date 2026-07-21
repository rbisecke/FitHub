import Link from "next/link";

export function EmptyRecords() {
  return (
    <div className="flex flex-col items-center text-center px-[42px] py-[52px] bg-[var(--card)] border border-dashed border-[var(--border)] rounded-2xl max-w-xl mx-auto mt-2 animate-fadeUp">
      <p className="font-mono text-[11px] text-[var(--muted)] mb-3">
        $ git tag --list
      </p>
      <h2 className="font-heading text-[20px] mb-2">
        No milestones tagged yet
      </h2>
      <p className="text-[13px] text-[var(--muted)] max-w-[420px] mx-auto mb-5">
        Tag a personal record to mark your best — one movement, your top result.
        Each PR is a commit in your fitness history.
      </p>
      <Link
        href="/log/tag"
        className="inline-flex items-center gap-2 bg-[var(--accent)] text-[var(--bg)] font-mono font-bold text-[13px] px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
      >
        $ git tag
      </Link>
    </div>
  );
}
