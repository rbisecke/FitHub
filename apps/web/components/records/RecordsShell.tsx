"use client";

import Link from "next/link";
import { useState } from "react";
import type { PersonalRecord, E1RMPoint } from "@/lib/api";
import type { PRCategory } from "@/lib/records/categorise";
import {
  categorise,
  CATEGORY_ORDER,
  CATEGORY_LABEL,
} from "@/lib/records/categorise";
import { RecordsHeader } from "./RecordsHeader";
import { CategoryTabs } from "./CategoryTabs";
import type { CategoryFilter } from "./CategoryTabs";
import { CategorySection } from "./CategorySection";
import { TimelineView } from "./TimelineView";
import { EmptyRecords } from "./EmptyRecords";
import { NewPRBanner } from "./NewPRBanner";
import { PRCard } from "./PRCard";
import { EmptyRecordSlot } from "./EmptyRecordSlot";

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
      <div className="px-[18px] pt-[14px] pb-2 md:px-4 md:py-6 max-w-5xl mx-auto">
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

  // Banner data: use first recent PR's name and value
  const recentPR = prs.find((pr) => recentPRIds.includes(pr.movement_id));
  const recentMovement = recentPR?.movement_name ?? "";
  const recentValue = recentPR ? `${recentPR.best_1rm_kg.toFixed(1)} kg` : "";

  // Which category sections to show (desktop)
  const categoriesToShow: PRCategory[] =
    activeCategory === "all"
      ? CATEGORY_ORDER.filter((c) => categorised[c].length > 0)
      : [activeCategory as PRCategory];

  // Mobile: all categories with at least 1 PR
  const mobileCats = CATEGORY_ORDER.filter((c) => categorised[c].length > 0);

  return (
    <div className="px-[18px] pt-[14px] pb-2 md:px-4 md:py-6 max-w-5xl mx-auto">
      {/* Mobile back button */}
      <div className="md:hidden flex items-center gap-[9px] mb-[14px]">
        <Link
          href="/dashboard"
          className="flex text-[var(--muted)]"
          aria-label="Back to home"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <span className="font-data text-[11.5px] text-[var(--muted)]">
          Home
        </span>
      </div>

      <RecordsHeader
        viewMode={viewMode}
        onToggle={setViewMode}
        totalCount={prs.length}
      />

      {/* Mobile PR announcement banner */}
      {recentPRIds.length > 0 && (
        <div
          className="md:hidden flex items-start gap-[11px] rounded-[13px] mb-[16px] p-[11px_14px]"
          style={{
            background: "rgba(255,200,61,0.1)",
            border: "1px solid rgba(255,200,61,0.3)",
          }}
        >
          <span className="text-[18px] leading-none mt-px flex-shrink-0">
            🏆
          </span>
          <div>
            <div
              className="font-bold text-[12px]"
              style={{ color: "var(--gold)" }}
            >
              New PR in the last 24h!
            </div>
            <div className="font-data text-[10.5px] text-[var(--muted)] mt-[2px]">
              {recentMovement} — {recentValue}
              {recentPRIds.length > 1 && ` + ${recentPRIds.length - 1} more`}
            </div>
          </div>
        </div>
      )}

      {/* Desktop PR banner */}
      <div className="hidden md:block">
        <NewPRBanner
          movement={recentMovement}
          value={recentValue}
          count={recentPRIds.length}
        />
      </div>

      {/* Desktop category filter pills */}
      <div className="hidden md:block mb-6">
        <CategoryTabs
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
        />
      </div>

      {/* Desktop sections */}
      <div className="hidden md:block">
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

      {/* Mobile sections: all non-empty categories, 2-col compact grid */}
      <div className="md:hidden space-y-5">
        {mobileCats.map((cat) => (
          <div key={cat}>
            <div className="flex items-center gap-[9px] mb-[12px]">
              <span className="font-data text-[11px] text-[var(--muted)] uppercase tracking-[0.5px]">
                {CATEGORY_LABEL[cat]}
              </span>
              <span className="h-px flex-1 bg-[var(--border)]" />
            </div>
            <div className="grid grid-cols-2 gap-[9px]">
              {categorised[cat].map((pr) => (
                <PRCard
                  key={pr.movement_id}
                  pr={pr}
                  points={trendMap[pr.movement_id] ?? []}
                  isRecent={recentPRIds.includes(pr.movement_id)}
                  category={cat}
                />
              ))}
              {categorised[cat].length % 2 !== 0 && <EmptyRecordSlot />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
