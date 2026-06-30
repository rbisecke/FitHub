import Link from "next/link";

export function EmptyRecords() {
  return (
    <div className="flex flex-col items-center text-center px-[42px] py-[52px] bg-[var(--card)] border border-dashed border-[var(--border)] rounded-2xl max-w-xl mx-auto mt-2 animate-fadeUp">
      <div className="text-[40px] mb-3" aria-hidden="true">
        🏷️
      </div>
      <h2 className="font-heading text-[20px] mb-2">No records tagged yet</h2>
      <p className="text-[13px] text-[var(--muted)] max-w-[420px] mx-auto mb-5">
        Log workouts with weighted movements to automatically track your
        personal records. Every PR gets tagged like a git release.
      </p>
      <Link
        href="/log/new"
        className="inline-flex items-center gap-2 bg-[var(--accent)] text-[#0A0D12] font-bold text-[13px] px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
      >
        Log your first result
      </Link>
    </div>
  );
}
