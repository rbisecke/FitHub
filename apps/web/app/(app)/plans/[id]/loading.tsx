export default function PlanDetailLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 flex flex-col gap-6">
      <div className="h-3 w-24 animate-pulse rounded bg-[var(--surface)]" />
      <div className="space-y-2">
        <div className="h-3 w-32 animate-pulse rounded bg-[var(--surface)]" />
        <div className="h-8 w-56 animate-pulse rounded bg-[var(--surface)]" />
        <div className="h-3 w-48 animate-pulse rounded bg-[var(--surface)]" />
      </div>
      <div className="h-28 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
      <div className="h-32 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
      <div className="h-48 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
    </div>
  );
}
