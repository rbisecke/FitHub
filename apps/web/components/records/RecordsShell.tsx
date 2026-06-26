"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { PersonalRecord, E1RMPoint } from "@/lib/api";
import type { PRCategory } from "@/lib/records/categorise";
import {
  categorise,
  CATEGORY_ORDER,
  CATEGORY_LABEL,
} from "@/lib/records/categorise";
import { RecordsHeader } from "./RecordsHeader";
import { CategoryTabs } from "./CategoryTabs";
import { CategorySection } from "./CategorySection";
import { TimelineView } from "./TimelineView";
import { EmptyRecords } from "./EmptyRecords";
import { EmptyCategoryState } from "./EmptyCategoryState";
import { NewPRBanner } from "./NewPRBanner";
import { PRCard } from "./PRCard";

interface Props {
  prs: PersonalRecord[];
  trendMap: Record<string, E1RMPoint[]>;
  recentPRIds: string[];
}

export function RecordsShell({ prs, trendMap, recentPRIds }: Props) {
  const [viewMode, setViewMode] = useState<"current" | "timeline">("current");
  const [activeCategory, setActiveCategory] = useState<PRCategory>("strength");

  if (prs.length === 0) {
    return (
      <div className="px-4 py-6 max-w-5xl mx-auto">
        <RecordsHeader viewMode={viewMode} onToggle={setViewMode} />
        <EmptyRecords />
      </div>
    );
  }

  const categorised: Record<PRCategory, PersonalRecord[]> = {
    strength: [],
    gymnastics: [],
    metcon: [],
    endurance: [],
  };
  for (const pr of prs) {
    const cat = categorise(pr.movement_name);
    categorised[cat].push(pr);
  }

  const availableCategories = new Set<PRCategory>(
    CATEGORY_ORDER.filter((c) => categorised[c].length > 0),
  );

  const effectiveCategory: PRCategory = availableCategories.has(activeCategory)
    ? activeCategory
    : CATEGORY_ORDER.find((c) => availableCategories.has(c)) ?? "strength";

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        {/* Mobile header row */}
        <div className="flex items-start justify-between md:hidden mb-2">
          <div>
            <p className="font-mono text-xs text-[--muted] mb-1">$ git tag</p>
            <h1 className="text-2xl font-bold text-[--text]">
              Personal Records
            </h1>
          </div>
          <Sheet>
            <SheetTrigger
              className="mt-1 p-2 rounded text-[--muted] hover:text-[--text] min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Open filter options"
            >
              <SlidersHorizontal className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="bg-[--surface] border-[--border]"
            >
              <SheetHeader>
                <SheetTitle className="font-mono text-sm text-[--text]">
                  View options
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <p className="text-xs text-[--muted] font-mono mb-2">
                  View mode
                </p>
                <div
                  role="group"
                  aria-label="View mode"
                  className="flex rounded border border-[--border] overflow-hidden w-fit"
                >
                  {(["current", "timeline"] as const).map((mode) => (
                    <button
                      key={mode}
                      aria-pressed={viewMode === mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-4 py-2 font-mono text-xs capitalize transition-colors min-h-[44px] ${
                        viewMode === mode
                          ? "bg-[#21262d] text-[--text]"
                          : "text-[--muted] hover:text-[--text]"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop header */}
        <div className="hidden md:block">
          <RecordsHeader viewMode={viewMode} onToggle={setViewMode} />
        </div>
      </div>

      {/* New PR banner */}
      <NewPRBanner count={recentPRIds.length} />

      {/* Mobile: category tabs */}
      <div className="md:hidden mb-4">
        <CategoryTabs
          activeCategory={effectiveCategory}
          availableCategories={availableCategories}
          onSelect={setActiveCategory}
        />
      </div>

      {/* Content */}
      {viewMode === "current" ? (
        <>
          {/* Mobile: single category */}
          <div
            className="md:hidden"
            role="tabpanel"
            aria-label={`${CATEGORY_LABEL[effectiveCategory]} records`}
          >
            {categorised[effectiveCategory].length === 0 ? (
              <EmptyCategoryState
                category={CATEGORY_LABEL[effectiveCategory]}
              />
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {categorised[effectiveCategory].map((pr) => (
                  <PRCard
                    key={pr.movement_id}
                    pr={pr}
                    points={trendMap[pr.movement_id] ?? []}
                    isRecent={recentPRIds.includes(pr.movement_id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Desktop: all categories */}
          <div className="hidden md:block space-y-8">
            {CATEGORY_ORDER.map((cat) => (
              <CategorySection
                key={cat}
                category={cat}
                prs={categorised[cat]}
                trendMap={trendMap}
                recentPRIds={recentPRIds}
              />
            ))}
          </div>
        </>
      ) : (
        <TimelineView categorised={categorised} trendMap={trendMap} />
      )}
    </div>
  );
}
