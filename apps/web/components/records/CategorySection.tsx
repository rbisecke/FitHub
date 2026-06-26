import type { PersonalRecord, E1RMPoint } from "@/lib/api";
import type { PRCategory } from "@/lib/records/categorise";
import { CATEGORY_LABEL } from "@/lib/records/categorise";
import { PRCard } from "./PRCard";

interface Props {
  category: PRCategory;
  prs: PersonalRecord[];
  trendMap: Record<string, E1RMPoint[]>;
  recentPRIds: string[];
}

export function CategorySection({
  category,
  prs,
  trendMap,
  recentPRIds,
}: Props) {
  if (prs.length === 0) return null;

  return (
    <section aria-label={`${CATEGORY_LABEL[category]} records`}>
      <div className="sticky top-0 bg-[--bg]/90 backdrop-blur-sm z-10 py-2 border-b border-[--border] mb-3">
        <p className="text-xs font-mono uppercase tracking-wider text-[--muted-strong]">
          {CATEGORY_LABEL[category]}{" "}
          <span className="text-[--muted]">
            ({prs.length} {prs.length === 1 ? "record" : "records"})
          </span>
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {prs.map((pr) => (
          <PRCard
            key={pr.movement_id}
            pr={pr}
            points={trendMap[pr.movement_id] ?? []}
            isRecent={recentPRIds.includes(pr.movement_id)}
          />
        ))}
      </div>
    </section>
  );
}
