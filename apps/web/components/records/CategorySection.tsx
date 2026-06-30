import type { PersonalRecord, E1RMPoint } from "@/lib/api";
import type { PRCategory } from "@/lib/records/categorise";
import { CATEGORY_LABEL } from "@/lib/records/categorise";
import { PRCard } from "./PRCard";
import { EmptyCategoryState } from "./EmptyCategoryState";

interface Props {
  category: PRCategory;
  prs: PersonalRecord[];
  trendMap: Record<string, E1RMPoint[]>;
  recentPRIds: string[];
}

const DOT_COLOR: Record<PRCategory, string> = {
  strength: "#58a6ff",
  gymnastics: "#bc8cff",
  metcon: "#FF7A45",
  endurance: "#4ADE80",
};

export function CategorySection({
  category,
  prs,
  trendMap,
  recentPRIds,
}: Props) {
  return (
    <section aria-label={`${CATEGORY_LABEL[category]} records`}>
      {/* Section header: colored dot + name + count + rule */}
      <div className="flex items-center gap-3 mb-4">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ background: DOT_COLOR[category] }}
          aria-hidden="true"
        />
        <span className="font-heading text-[17px] text-[var(--foreground)]">
          {CATEGORY_LABEL[category]}
        </span>
        <span className="text-[13px] text-[var(--muted)]">
          {prs.length} {prs.length === 1 ? "record" : "records"}
        </span>
        <span className="flex-1 h-px bg-[var(--border)]" aria-hidden="true" />
      </div>

      {prs.length === 0 ? (
        <EmptyCategoryState category={CATEGORY_LABEL[category]} />
      ) : (
        <div className="grid grid-cols-1 gap-[13px] sm:grid-cols-2 lg:grid-cols-3">
          {prs.map((pr) => (
            <PRCard
              key={pr.movement_id}
              pr={pr}
              points={trendMap[pr.movement_id] ?? []}
              isRecent={recentPRIds.includes(pr.movement_id)}
              category={category}
            />
          ))}
        </div>
      )}
    </section>
  );
}
