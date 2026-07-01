"use client";

import { useState, useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/history/FilterBar";
import { DateGroupHeader } from "@/components/history/DateGroupHeader";
import { WorkoutCard } from "./WorkoutCard";
import { WorkoutCardSkeleton } from "./WorkoutCardSkeleton";
import {
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
  movementFilter: string | null,
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
    if (
      movementFilter &&
      (item.title?.toLowerCase().indexOf(movementFilter.toLowerCase()) ??
        -1) === -1
    )
      return false;
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
  const [movementFilter, setMovementFilter] = useState<string | null>(null);

  const prefersReduced = useReducedMotion();
  const filtersActive = isFilterActive(filters) || !!movementFilter;

  const displayedItems = useMemo(
    () => applyClientFilters(items, filters, movementFilter),
    [items, filters, movementFilter],
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

  function handleMovementFilter(m: { id: string; name: string }) {
    setMovementFilter(m.name);
    setExpandedId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const isEmpty = displayedItems.length === 0;
  const isEmptyCleanSlate = isEmpty && !filtersActive && !loadingMore;
  const isEmptyDueToFilter = isEmpty && filtersActive;

  return (
    <div className="p-6 max-w-2xl mx-auto pb-nav-safe">
      {/* Page header */}
      <PageHeader
        gitCommand="$ git log --all --graph"
        title="History"
        sub="Every session you've ever committed — newest first. Tap a commit to expand it."
      />

      {/* Filter bar — pills + advanced panel */}
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        onClear={() => setFilters(DEFAULT_FILTERS)}
        movementFilter={movementFilter}
        onClearMovementFilter={() => setMovementFilter(null)}
      />

      {/* Empty: clean slate */}
      {isEmptyCleanSlate && (
        <div className="bg-[var(--card)] border border-dashed border-[var(--border)] rounded-2xl p-[42px] text-center animate-fadeUp">
          <div className="text-[30px] opacity-40 mb-3">🌱</div>
          <p className="font-heading text-xl text-[var(--foreground)] mb-2">
            No commits yet
          </p>
          <p className="text-sm text-[var(--muted-foreground)] mb-6">
            Every workout you log becomes a commit in your fitness repository.
          </p>
          <Link
            href="/log/new"
            className="inline-flex items-center gap-2 bg-[rgba(74,222,128,0.15)] border border-[rgba(74,222,128,0.4)] text-[var(--accent)] font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-[rgba(74,222,128,0.25)] transition-colors"
          >
            Track your first workout
          </Link>
        </div>
      )}

      {/* Empty: filter has no results */}
      {isEmptyDueToFilter && (
        <div className="bg-[var(--card)] border border-dashed border-[var(--border)] rounded-2xl p-[42px] text-center animate-fadeUp">
          <div className="text-[30px] opacity-40 mb-3 select-none">∅</div>
          <p className="font-bold text-[14px] text-[var(--foreground)] mb-2">
            No commits match these filters
          </p>
          <p className="text-sm text-[var(--muted-foreground)] mb-6">
            Try widening the date range or clearing a filter.
          </p>
          <button
            onClick={() => {
              setFilters(DEFAULT_FILTERS);
              setMovementFilter(null);
            }}
            className="inline-flex items-center gap-2 bg-[rgba(74,222,128,0.15)] border border-[rgba(74,222,128,0.4)] text-[var(--accent)] font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-[rgba(74,222,128,0.25)] transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Feed */}
      {!isEmpty && (
        <div>
          {(() => {
            let cardIndex = 0;
            return groups.map((group) => (
              <div key={group.date}>
                <DateGroupHeader
                  date={group.date}
                  count={group.workouts.length}
                />
                <div>
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

          {/* Skeleton cards during load-more */}
          {loadingMore && (
            <div className="mt-2">
              {Array.from({ length: 3 }, (_, i) => (
                <WorkoutCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Load more */}
          {!filtersActive && !allLoaded && !loadingMore && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 text-xs font-data text-[var(--muted-foreground)] border border-[var(--border)] rounded-lg px-4 py-2 hover:border-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                <Loader2 className="h-3 w-3" />
                Load more commits ↓
              </button>
            </div>
          )}

          {/* End-of-history marker */}
          {allLoaded && !filtersActive && (
            <div className="flex items-stretch gap-0 mt-4">
              <div className="w-[38px] flex-shrink-0 flex justify-center relative">
                <div className="absolute top-0 h-4 w-0.5 bg-[var(--border)]" />
                <div className="mt-4 z-10 w-[9px] h-[9px] rounded-full border-2 border-[var(--border)] bg-[var(--background)]" />
              </div>
              <div className="flex-1 min-w-0 mt-[18px] pb-4">
                <p className="text-[11.5px] text-[var(--muted-foreground)] font-data">
                  root commit · the beginning of your journey
                </p>
              </div>
            </div>
          )}

          {/* Note when filters are active */}
          {filtersActive && !isEmpty && (
            <p className="mt-6 text-center text-xs font-data text-[var(--muted-foreground)]">
              Filtering over {items.length} loaded commit
              {items.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
