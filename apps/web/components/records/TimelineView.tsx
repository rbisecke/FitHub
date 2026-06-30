import type { PersonalRecord, E1RMPoint } from "@/lib/api";
import type { PRCategory } from "@/lib/records/categorise";
import { CATEGORY_ORDER } from "@/lib/records/categorise";

interface Props {
  categorised: Record<PRCategory, PersonalRecord[]>;
  trendMap: Record<string, E1RMPoint[]>;
}

const CAT_COLOR: Record<PRCategory, string> = {
  strength: "#58a6ff",
  gymnastics: "#bc8cff",
  metcon: "#FF7A45",
  endurance: "#4ADE80",
};

interface TimelineEntry {
  pr: PersonalRecord;
  category: PRCategory;
  achievedAt: string;
}

function relativeDate(isoDate: string): string {
  const d = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function formatAbsoluteDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TimelineView({ categorised, trendMap }: Props) {
  // Flatten all PRs into a single sorted list (newest first)
  const entries: TimelineEntry[] = [];
  for (const cat of CATEGORY_ORDER) {
    for (const pr of categorised[cat] ?? []) {
      entries.push({ pr, category: cat, achievedAt: pr.achieved_at });
    }
  }
  entries.sort(
    (a, b) =>
      new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime(),
  );

  if (entries.length === 0) {
    return (
      <p className="text-[13px] text-[var(--muted)] py-8 text-center">
        No records to show.
      </p>
    );
  }

  return (
    <div className="relative">
      {/* Vertical rail */}
      <div
        className="absolute left-[18px] top-0 bottom-0 w-px"
        style={{ background: "var(--border)" }}
        aria-hidden="true"
      />

      <div className="space-y-4 pl-10">
        {entries.map(({ pr, category, achievedAt }) => {
          const catColor = CAT_COLOR[category];
          const isToday = relativeDate(achievedAt) === "Today";
          const dotColor = isToday ? "var(--gold)" : catColor;

          // Get improvement for this PR
          const points = (trendMap[pr.movement_id] ?? []).sort((a, b) =>
            a.day.localeCompare(b.day),
          );
          let improvement: string | null = null;
          if (points.length >= 2) {
            const prev = points[points.length - 2]!.estimated_1rm_kg;
            const curr = points[points.length - 1]!.estimated_1rm_kg;
            const delta = curr - prev;
            if (delta > 0.01) {
              improvement = `+${delta.toFixed(1)} kg`;
            }
          }

          return (
            <div key={pr.movement_id} className="relative flex items-start">
              {/* Timeline node */}
              <div
                className="absolute -left-10 mt-[18px] w-2.5 h-2.5 rounded-full shrink-0 z-10"
                style={{
                  background: dotColor,
                  boxShadow: isToday ? `0 0 6px ${dotColor}80` : "none",
                  marginLeft: "-1.625rem",
                }}
                aria-hidden="true"
              />

              {/* Entry card */}
              <div className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-xl p-[14px_16px] hover:border-[var(--accent)] transition-colors">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold text-[var(--foreground)]">
                      {pr.movement_name}
                    </span>
                    {/* Category pill */}
                    <span
                      className="text-[11px] font-semibold rounded-full px-2 py-0.5"
                      style={{
                        background: `${catColor}1a`,
                        color: catColor,
                        border: `1px solid ${catColor}40`,
                      }}
                    >
                      {category}
                    </span>
                    {isToday && (
                      <span
                        className="text-[10px] font-extrabold tracking-wide rounded-full px-2 py-0.5"
                        style={{
                          background: "rgba(255,200,61,0.14)",
                          color: "var(--gold)",
                          border: "1px solid rgba(255,200,61,0.3)",
                        }}
                      >
                        JUST TAGGED
                      </span>
                    )}
                  </div>
                  <time
                    dateTime={achievedAt}
                    className="text-[11px] text-[var(--muted)] shrink-0 mt-0.5"
                    title={formatAbsoluteDate(achievedAt)}
                  >
                    {relativeDate(achievedAt)}
                  </time>
                </div>

                <div className="flex items-baseline gap-2">
                  <span
                    className="font-heading leading-none"
                    style={{ fontSize: "28px", color: "var(--gold)" }}
                  >
                    {pr.best_1rm_kg.toFixed(1)}
                    <span className="text-[14px] ml-1 text-[var(--muted)]">
                      kg
                    </span>
                  </span>
                  {improvement && (
                    <span className="text-[12px] font-semibold text-[var(--accent)]">
                      {improvement}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
