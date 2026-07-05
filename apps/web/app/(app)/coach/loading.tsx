export default function CoachLoading() {
  return (
    <div className="flex flex-col gap-4 px-4 py-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <div className="h-3 w-24 animate-pulse rounded bg-[var(--surface)]" />
      </div>
      <div className="h-7 w-48 animate-pulse rounded bg-[var(--surface)]" />
      <div className="flex-1 space-y-3 pt-2">
        <div className="grid gap-2 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded border border-[var(--border)] bg-[var(--surface)]"
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-4">
        <div className="h-10 flex-1 animate-pulse rounded border border-[var(--border)] bg-[var(--surface)]" />
        <div className="h-10 w-16 animate-pulse rounded bg-[var(--surface)]" />
      </div>
    </div>
  );
}
