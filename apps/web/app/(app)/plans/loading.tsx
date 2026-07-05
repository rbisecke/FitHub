export default function PlansLoading() {
  return (
    <div className="mx-auto max-w-[1100px] px-[18px] pt-[14px] pb-2 md:px-4 md:py-8">
      <div className="space-y-1 mb-6">
        <div className="h-3 w-20 animate-pulse rounded bg-[var(--surface)]" />
        <div className="h-8 w-32 animate-pulse rounded bg-[var(--surface)]" />
        <div className="h-4 w-72 animate-pulse rounded bg-[var(--surface)]" />
      </div>
      <div
        className="grid gap-[11px] md:gap-[14px]"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))" }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]"
          />
        ))}
      </div>
    </div>
  );
}
