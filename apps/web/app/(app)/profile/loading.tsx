export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 animate-pulse rounded-full bg-[var(--surface)]" />
        <div className="space-y-2">
          <div className="h-5 w-32 animate-pulse rounded bg-[var(--surface)]" />
          <div className="h-3 w-24 animate-pulse rounded bg-[var(--surface)]" />
        </div>
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--surface)]"
          />
        ))}
      </div>
    </div>
  );
}
