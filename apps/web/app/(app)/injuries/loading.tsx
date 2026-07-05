export default function InjuriesLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div className="space-y-1">
        <div className="h-3 w-20 animate-pulse rounded bg-[var(--surface)]" />
        <div className="h-8 w-36 animate-pulse rounded bg-[var(--surface)]" />
        <div className="h-4 w-64 animate-pulse rounded bg-[var(--surface)]" />
      </div>
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]"
          />
        ))}
      </div>
    </div>
  );
}
