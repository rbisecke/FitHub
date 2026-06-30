"use client";

import { useState } from "react";
import type { PersonalRecord, E1RMPoint } from "@/lib/api";
import type { PRCategory } from "@/lib/records/categorise";
import { categorise, CATEGORY_ORDER } from "@/lib/records/categorise";
import { RecordsHeader } from "./RecordsHeader";
import { CategoryTabs } from "./CategoryTabs";
import type { CategoryFilter } from "./CategoryTabs";
import { CategorySection } from "./CategorySection";
import { TimelineView } from "./TimelineView";
import { EmptyRecords } from "./EmptyRecords";
import { NewPRBanner } from "./NewPRBanner";

interface Props {
  prs: PersonalRecord[];
  trendMap: Record<string, E1RMPoint[]>;
  recentPRIds: string[];
}

export function RecordsShell({ prs, trendMap, recentPRIds }: Props) {
  const [viewMode, setViewMode] = useState<"current" | "timeline">("current");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");

  // Empty state
  if (prs.length === 0) {
    return (
      <div className="px-4 py-6 max-w-5xl mx-auto">
        <RecordsHeader
          viewMode={viewMode}
          onToggle={setViewMode}
          totalCount={0}
        />
        <EmptyRecords />
      </div>
    );
  }

  // Categorise all PRs
  const categorised: Record<PRCategory, PersonalRecord[]> = {
    strength: [],
    gymnastics: [],
    metcon: [],
    endurance: [],
  };
  for (const pr of prs) {
    categorised[categorise(pr.movement_name)].push(pr);
  }

  // Banner: use first recent PR's name and value
  const recentPR = prs.find((pr) => recentPRIds.includes(pr.movement_id));
  const recentMovement = recentPR?.movement_name ?? "";
  const recentValue = recentPR ? `${recentPR.best_1rm_kg.toFixed(1)} kg` : "";

  // Which category sections to show
  const categoriesToShow: PRCategory[] =
    activeCategory === "all"
      ? CATEGORY_ORDER.filter((c) => categorised[c].length > 0)
      : [activeCategory as PRCategory];

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto">
      <RecordsHeader
        viewMode={viewMode}
        onToggle={setViewMode}
        totalCount={prs.length}
      />

      <NewPRBanner
        movement={recentMovement}
        value={recentValue}
        count={recentPRIds.length}
      />

      {/* Category filter pills */}
      <div className="mb-6">
        <CategoryTabs
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
        />
      </div>

      {viewMode === "current" ? (
        <div className="space-y-8">
          {categoriesToShow.map((cat) => (
            <CategorySection
              key={cat}
              category={cat}
              prs={categorised[cat]}
              trendMap={trendMap}
              recentPRIds={recentPRIds}
            />
          ))}
        </div>
      ) : (
        <TimelineView categorised={categorised} trendMap={trendMap} />
      )}
    </div>
  );
}
