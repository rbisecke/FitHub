export default function WorkoutDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div className="h-3 w-24 animate-pulse rounded bg-[var(--surface)]" />
      <div className="space-y-2">
        <div className="h-3 w-16 animate-pulse rounded bg-[var(--surface)]" />
        <div className="h-8 w-56 animate-pulse rounded bg-[var(--surface)]" />
        <div className="h-3 w-40 animate-pulse rounded bg-[var(--surface)]" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--surface)]"
          />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--surface)]"
          />
        ))}
      </div>
    </div>
  );
}
