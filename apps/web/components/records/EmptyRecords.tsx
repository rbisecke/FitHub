import Link from "next/link";

export function EmptyRecords() {
  return (
    <div className="flex flex-col items-center py-24 gap-4 text-center px-4">
      <p className="font-mono text-sm text-[--muted]">$ git tag</p>
      <p className="text-sm text-[--muted]">Your repo has no tags yet.</p>
      <p className="text-sm text-[--muted]">
        Log a workout and set your first PR to see your fitness milestones here.
      </p>
      <Link
        href="/log/new"
        className="border border-[--border] text-[--text] font-mono text-xs px-4 py-2 rounded hover:border-[--muted] hover:text-[--text] transition-colors"
      >
        $ git commit → Log a workout
      </Link>
    </div>
  );
}
