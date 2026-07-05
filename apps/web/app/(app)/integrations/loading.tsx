export default function IntegrationsLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <div className="space-y-1">
        <div className="h-3 w-24 animate-pulse rounded bg-[var(--surface)]" />
        <div className="h-8 w-40 animate-pulse rounded bg-[var(--surface)]" />
        <div className="h-4 w-60 animate-pulse rounded bg-[var(--surface)]" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]"
          />
        ))}
      </div>
    </div>
  );
}
