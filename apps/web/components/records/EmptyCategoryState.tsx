import Link from "next/link";

interface Props {
  category: string;
}

export function EmptyCategoryState({ category }: Props) {
  return (
    <div className="flex flex-col items-center text-center px-8 py-10 bg-[var(--card)] border border-dashed border-[var(--border)] rounded-2xl animate-fadeUp">
      <p className="text-[14px] font-semibold text-[var(--foreground)] mb-1">
        No {category} records yet
      </p>
      <p className="text-[12px] text-[var(--muted)] mb-4">
        Log a weighted {category.toLowerCase()} movement to set your first tag.
      </p>
      <Link
        href="/log/new"
        className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[#0A0D12] px-3 py-1.5 rounded-lg transition-colors border border-[var(--accent)]"
      >
        Log a {category.toLowerCase()} result →
      </Link>
    </div>
  );
}
