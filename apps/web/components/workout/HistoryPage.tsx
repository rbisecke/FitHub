"use client";

import { useState, useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { WorkoutCard } from "./WorkoutCard";
import { WorkoutCardSkeleton } from "./WorkoutCardSkeleton";
import { DateSeparator } from "./DateSeparator";
import {
  HistoryControls,
  DEFAULT_FILTERS,
  isFilterActive,
  type HistoryFilters,
} from "./HistoryControls";
import { api } from "@/lib/api/client";
import type { WorkoutSummary } from "@/lib/api";

// Fallback tag detection (until B7 adds is_tag column)
function isTagEntry(item: WorkoutSummary): boolean {
  return !item.session_type && item.result_count === 1;
}

function applyClientFilters(
  items: WorkoutSummary[],
  filters: HistoryFilters,
): WorkoutSummary[] {
  return items.filter((item) => {
    if (filters.sessionType && item.session_type !== filters.sessionType)
      return false;
    if (
      filters.partnerFilter === "partner" &&
      item.workout_format !== "partner" &&
      item.workout_format !== "team"
    )
      return false;
    if (
      filters.partnerFilter === "solo" &&
      (item.workout_format === "partner" || item.workout_format === "team")
    )
      return false;
    if (filters.dateFrom && item.performed_at.slice(0, 10) < filters.dateFrom)
      return false;
    if (filters.dateTo && item.performed_at.slice(0, 10) > filters.dateTo)
      return false;
    if (filters.tagsFilter === "tags-only" && !isTagEntry(item)) return false;
    if (filters.tagsFilter === "no-tags" && isTagEntry(item)) return false;
    return true;
  });
}

function groupByDate(
  items: WorkoutSummary[],
): { date: string; workouts: WorkoutSummary[] }[] {
  const groups: { date: string; workouts: WorkoutSummary[] }[] = [];
  for (const w of items) {
    const date = w.performed_at.slice(0, 10);
    const last = groups[groups.length - 1];
    if (last && last.date === date) {
      last.workouts.push(w);
    } else {
      groups.push({ date, workouts: [w] });
    }
  }
  return groups;
}

interface HistoryPageProps {
  initialItems: WorkoutSummary[];
  initialNextCursor: string | null;
  accessToken: string;
}

export function HistoryPage({
  initialItems,
  initialNextCursor,
  accessToken,
}: HistoryPageProps) {
  const [items, setItems] = useState<WorkoutSummary[]>(initialItems);
  const [nextCursor, setNextCursor] = useState<string | null>(
    initialNextCursor,
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [allLoaded, setAllLoaded] = useState(!initialNextCursor);
  const [filters, setFilters] = useState<HistoryFilters>(DEFAULT_FILTERS);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const prefersReduced = useReducedMotion();
  const filtersActive = isFilterActive(filters);

  const displayedItems = useMemo(
    () => applyClientFilters(items, filters),
    [items, filters],
  );

  const groups = useMemo(() => groupByDate(displayedItems), [displayedItems]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { items: newItems, next_cursor } = await api.workouts.list(
        accessToken,
        { beforeId: nextCursor, limit: 20 },
      );
      setItems((prev) => [...prev, ...newItems]);
      setNextCursor(next_cursor);
      setAllLoaded(!next_cursor);
    } catch {
      toast.error("Failed to load more workouts");
    } finally {
      setLoadingMore(false);
    }
  }

  function handleToggle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function handleMovementFilter() {
    // Movement filter deferred pending backend support (no movement_names[] in WorkoutSummary yet)
    setExpandedId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const isEmpty = displayedItems.length === 0;
  const isEmptyCleanSlate = isEmpty && !filtersActive && !loadingMore;
  const isEmptyDueToFilter = isEmpty && filtersActive;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Heading row: h1 + mobile-only filter trigger */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <h1
          className="text-xl font-semibold text-[#e6edf3] whitespace-nowrap"
          aria-label="$ git log"
        >
          <span
            aria-hidden="true"
            className="font-mono text-[#8b949e] mr-2 text-sm"
          >
            $
          </span>
          git log
        </h1>
        {/* Mobile trigger only — desktop row is below the subtitle */}
        <HistoryControls
          filters={filters}
          onFiltersChange={setFilters}
          onClear={() => setFilters(DEFAULT_FILTERS)}
          showDesktopRow={false}
        />
      </div>
      <p className="text-xs font-mono text-[#8b949e] mb-3">
        Your workout history
      </p>
      {/* Desktop filter row — full-width below subtitle, hidden on mobile */}
      <div className="hidden md:block mb-6">
        <HistoryControls
          filters={filters}
          onFiltersChange={setFilters}
          onClear={() => setFilters(DEFAULT_FILTERS)}
          showMobileTrigger={false}
        />
      </div>

      {/* Empty: clean slate */}
      {isEmptyCleanSlate && (
        <div className="py-24 flex flex-col items-center gap-4 text-center">
          <p className="text-[#8b949e] font-mono text-sm">
            Your commit history is empty.
          </p>
          <p className="text-[#8b949e] font-mono text-sm">
            Log your first workout to start building your repo.
          </p>
          <Link
            href="/log/new"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "font-mono border-[#30363d] text-[#8b949e] hover:border-[#58a6ff]/40 hover:text-[#e6edf3]",
            )}
          >
            git commit --fit
          </Link>
        </div>
      )}

      {/* Empty: filter has no results */}
      {isEmptyDueToFilter && (
        <div className="py-24 flex flex-col items-center gap-4 text-center">
          <p className="text-[#8b949e] font-mono text-sm">
            No workouts match this filter.
          </p>
          <p className="text-[#8b949e] font-mono text-sm">
            Broaden your search or clear the filter.
          </p>
          <Button
            variant="outline"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="font-mono border-[#30363d] text-[#8b949e] hover:border-[#58a6ff]/40 hover:text-[#e6edf3]"
          >
            Clear filter
          </Button>
        </div>
      )}

      {/* Feed */}
      {!isEmpty && (
        <div className="space-y-6">
          {(() => {
            let cardIndex = 0;
            return groups.map((group) => (
              <div key={group.date}>
                <DateSeparator date={group.date} />
                <div className="space-y-3">
                  {group.workouts.map((workout) => {
                    const thisIndex = cardIndex++;
                    return (
                      <motion.div
                        key={workout.id}
                        initial={prefersReduced ? {} : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.2,
                          delay: Math.min(thisIndex, 8) * 0.05,
                        }}
                      >
                        <WorkoutCard
                          workout={workout}
                          isExpanded={expandedId === workout.id}
                          onToggle={() => handleToggle(workout.id)}
                          accessToken={accessToken}
                          onMovementFilter={handleMovementFilter}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      {/* Skeleton cards during load-more */}
      {loadingMore && (
        <div className="space-y-3 mt-6">
          {Array.from({ length: 3 }, (_, i) => (
            <WorkoutCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Load more — hidden when filters active (client-side filters don't interact well with pagination) */}
      {!filtersActive && !allLoaded && (
        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loadingMore}
            className="font-mono text-sm text-[#8b949e] border-[#30363d] hover:border-[#58a6ff]/40 hover:text-[#e6edf3]"
          >
            {loadingMore ? (
              <>
                <Loader2 className="animate-spin h-3 w-3 mr-2" />
                Loading…
              </>
            ) : (
              "Load more workouts ↓"
            )}
          </Button>
        </div>
      )}

      {/* Note when filters are active and limiting load-more */}
      {filtersActive && !isEmpty && (
        <p className="mt-6 text-center text-xs font-mono text-[#8b949e]">
          Filtering over {items.length} loaded workout
          {items.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
