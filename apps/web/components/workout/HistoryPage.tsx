"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
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

// Apply client-side-only filters (tagsFilter) to an already server-filtered list.
// Movement filter display is handled by FilterBar pills; WorkoutSummary doesn't include
// movement names so item-level movement filtering is not applied here.
function applyClientFilters(
  items: WorkoutSummary[],
  tagsFilter: HistoryFilters["tagsFilter"],
): WorkoutSummary[] {
  return items.filter((item) => {
    if (tagsFilter === "tags-only" && !item.is_tag) return false;
    if (tagsFilter === "no-tags" && item.is_tag) return false;
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

/** Returns server-side filter params from the current HistoryFilters state */
function toServerParams(filters: HistoryFilters): {
  sessionType?: string;
  partnerOnly?: boolean;
  dateFrom?: string;
  dateTo?: string;
} {
  const params: {
    sessionType?: string;
    partnerOnly?: boolean;
    dateFrom?: string;
    dateTo?: string;
  } = {};
  if (filters.sessionType) params.sessionType = filters.sessionType;
  if (filters.partnerFilter === "partner") params.partnerOnly = true;
  if (filters.partnerFilter === "solo") params.partnerOnly = false;
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  return params;
}

/** Returns true when any server-side filter dimension is active */
function isServerFilterActive(filters: HistoryFilters): boolean {
  return (
    filters.sessionType !== null ||
    filters.partnerFilter !== "all" ||
    filters.dateFrom !== null ||
    filters.dateTo !== null
  );
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
  const [refetching, setRefetching] = useState(false);

  const prefersReduced = useReducedMotion();
  const serverFilterActive = isServerFilterActive(filters);
  const filtersActive = isFilterActive(filters) || !!movementFilter;

  // Ref to cancel stale re-fetch requests when filters change rapidly
  const fetchVersionRef = useRef(0);

  // When server-side filters change: reset to page 1 and re-fetch
  const prevFiltersRef = useRef<HistoryFilters>(DEFAULT_FILTERS);
  useEffect(() => {
    const prev = prevFiltersRef.current;
    prevFiltersRef.current = filters;

    const serverChanged =
      prev.sessionType !== filters.sessionType ||
      prev.partnerFilter !== filters.partnerFilter ||
      prev.dateFrom !== filters.dateFrom ||
      prev.dateTo !== filters.dateTo;

    if (!serverChanged) return;

    const version = ++fetchVersionRef.current;
    setRefetching(true);
    setNextCursor(null);
    setAllLoaded(false);

    const params = toServerParams(filters);
    api.workouts
      .list(accessToken, { limit: 20, ...params })
      .then(({ items: newItems, next_cursor }) => {
        if (fetchVersionRef.current !== version) return;
        setItems(newItems);
        setNextCursor(next_cursor);
        setAllLoaded(!next_cursor);
      })
      .catch(() => {
        if (fetchVersionRef.current !== version) return;
        toast.error("Failed to reload filtered workouts");
      })
      .finally(() => {
        if (fetchVersionRef.current !== version) return;
        setRefetching(false);
      });
  }, [filters, accessToken]);

  const displayedItems = useMemo(
    () => applyClientFilters(items, filters.tagsFilter),
    [items, filters.tagsFilter],
  );

  const groups = useMemo(() => groupByDate(displayedItems), [displayedItems]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const serverParams = toServerParams(filters);
      const { items: newItems, next_cursor } = await api.workouts.list(
        accessToken,
        { beforeId: nextCursor, limit: 20, ...serverParams },
      );
      setItems((prev) => [...prev, ...newItems]);
      setNextCursor(next_cursor);
      setAllLoaded(!next_cursor);
    } catch {
      toast.error("Failed to load more workouts");
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, accessToken, filters]);

  function handleToggle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function handleMovementFilter(m: { id: string; name: string }) {
    setMovementFilter(m.name);
    setExpandedId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleClearFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  const isEmpty = displayedItems.length === 0;
  const isEmptyCleanSlate =
    isEmpty && !filtersActive && !loadingMore && !refetching;
  const isEmptyDueToFilter = isEmpty && filtersActive && !refetching;
  // Show "keep scrolling" hint when empty due to date filter but there are more server pages
  const hasMoreServerPages = !allLoaded && !!nextCursor;
  const showKeepScrollingHint =
    isEmptyDueToFilter &&
    (filters.dateFrom || filters.dateTo) &&
    hasMoreServerPages;

  return (
    <div className="px-[18px] pt-[14px] pb-2 md:px-6 md:py-6 max-w-[920px] mx-auto pb-nav-safe">
      {/* Page header */}
      <PageHeader
        gitCommand="$ git log --all"
        title="History"
        sub="Every session you've ever committed — newest first. Tap a commit to expand it."
      />

      {/* Filter bar — pills + advanced panel + mobile sheet */}
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        onClear={handleClearFilters}
        movementFilter={movementFilter}
        onClearMovementFilter={() => setMovementFilter(null)}
      />

      {/* Loading state during filter re-fetch */}
      {refetching && (
        <div className="mt-2">
          {Array.from({ length: 3 }, (_, i) => (
            <WorkoutCardSkeleton key={i} />
          ))}
        </div>
      )}

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
      {isEmptyDueToFilter && !refetching && (
        <div className="bg-[var(--card)] border border-dashed border-[var(--border)] rounded-2xl p-[42px] text-center animate-fadeUp">
          <div className="text-[30px] opacity-40 mb-3 select-none">∅</div>
          <p className="font-bold text-[14px] text-[var(--foreground)] mb-2">
            No commits match these filters
          </p>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            Try widening the date range or clearing a filter.
          </p>
          {showKeepScrollingHint && (
            <p className="text-xs font-data text-[var(--muted-foreground)] mb-4 border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--surface-2)]">
              There may be older commits matching these filters — keep scrolling
              to load them
            </p>
          )}
          <button
            onClick={() => {
              handleClearFilters();
              setMovementFilter(null);
            }}
            className="inline-flex items-center gap-2 bg-[rgba(74,222,128,0.15)] border border-[rgba(74,222,128,0.4)] text-[var(--accent)] font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-[rgba(74,222,128,0.25)] transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Feed */}
      {!isEmpty && !refetching && (
        <div>
          {(() => {
            let cardIndex = 0;
            return groups.map((group) => (
              <div key={group.date}>
                <DateGroupHeader
                  date={group.date}
                  count={group.workouts.length}
                />
                <div className="flex flex-col gap-[9px] md:gap-0">
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
          {!allLoaded && !loadingMore && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 text-xs font-data text-[var(--muted-foreground)] border border-[var(--border)] rounded-lg px-4 py-2 hover:border-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                <Loader2 className="h-3 w-3" />
                {serverFilterActive
                  ? "Load more filtered commits ↓"
                  : "Load more commits ↓"}
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

          {/* Scroll hint - mobile only */}
          {!allLoaded && (
            <div className="md:hidden text-center font-data text-[11px] text-[var(--muted-foreground)] py-[22px] pb-[6px]">
              ↓ scroll for older commits
            </div>
          )}
        </div>
      )}
    </div>
  );
}
