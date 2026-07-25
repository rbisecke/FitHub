"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { WorkoutSummary } from "@/lib/api";
import { createApiClient } from "@/lib/api/client";
import { relativeDate } from "@/lib/display";
import { localDateKey, type DisplayUnits } from "@/lib/units";
import { WorkoutSummaryCard } from "./WorkoutSummaryCard";
import { TagMilestoneCard } from "./TagMilestoneCard";
import {
  DEFAULT_FILTERS,
  HistoryFilters,
  type HistoryFilterState,
} from "./HistoryFilters";

const PAGE_SIZE = 20;

interface MovementFilter {
  id: string;
  name: string;
}

/**
 * History feed — "git log" (01 §5). Reverse-chronological summary cards grouped
 * by calendar date, cursor-paginated (20/page) with infinite scroll, a filter
 * control (server-side session_type / partner / date range; client-side
 * tag/no-tag split), and the client-side movement re-scope entered from a
 * workout detail's "see all X history" (§5.3, §6). Light-themed like the whole
 * domain (§1.1); the parent route wraps it in ForcedTheme.
 */
export function HistoryFeed({
  token,
  units,
  initialItems,
  initialCursor,
  movementFilter = null,
}: {
  token: string;
  units: DisplayUnits;
  initialItems: WorkoutSummary[];
  initialCursor: string | null;
  movementFilter?: MovementFilter | null;
}) {
  const client = useMemo(() => createApiClient(token), [token]);

  const [filters, setFilters] = useState<HistoryFilterState>(DEFAULT_FILTERS);
  const [items, setItems] = useState<WorkoutSummary[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [movement, setMovement] = useState<MovementFilter | null>(
    movementFilter,
  );
  const [movementWorkoutIds, setMovementWorkoutIds] =
    useState<Set<string> | null>(null);
  const [movementError, setMovementError] = useState(false);

  // Tracks the in-flight "load more" request so it can be aborted both on
  // unmount and when a server-filter change replaces page 1 (loadMore is fired
  // from the IntersectionObserver callback, not an effect, so it can't rely on
  // effect cleanup to cancel — the controller lives here). Aborting it on a
  // filter change prevents a stale old-filter page appending after the reset.
  const loadMoreController = useRef<AbortController | null>(null);
  useEffect(() => () => loadMoreController.current?.abort(), []);

  // Only the server-side dimensions belong here; keying on the four primitives
  // (not the whole `filters` object) keeps the reference stable when the
  // client-side `tag` filter toggles, so that never triggers a server refetch.
  const serverParams = useMemo(
    () => ({
      limit: PAGE_SIZE,
      sessionType: filters.sessionType ?? undefined,
      partnerOnly:
        filters.partner === "all" ? undefined : filters.partner === "partner",
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
    }),
    [filters.sessionType, filters.partner, filters.dateFrom, filters.dateTo],
  );

  // Server-filter change → re-query from page 1 (§5.3). The first render reuses
  // the server-provided initial page, so skip a redundant refetch then.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    loadMoreController.current?.abort();
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(false);
    client.workouts
      .list(serverParams, { signal: controller.signal })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setCursor(res.next_cursor);
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled && !controller.signal.aborted) {
          setError(true);
          setLoading(false);
        }
        void err;
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [client, serverParams, reloadKey]);

  // Movement re-scope: collect the workout ids that contain the movement from the
  // movement-history endpoint, then filter the loaded feed to those (client-side,
  // display-only — not a server pagination dimension, §5.3).
  useEffect(() => {
    // When no movement is selected the `visible` filter short-circuits on the
    // null `movement`, so the stale id set is never read — no reset needed here
    // (which would be a discouraged synchronous setState in an effect body).
    if (!movement) return;
    const controller = new AbortController();
    let cancelled = false;
    client.analytics
      .movementHistory(movement.id, undefined, { signal: controller.signal })
      .then((rows) => {
        if (cancelled) return;
        setMovementError(false);
        setMovementWorkoutIds(new Set(rows.map((r) => r.workout_id)));
      })
      .catch((err) => {
        if (!cancelled && !controller.signal.aborted) setMovementError(true);
        void err;
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [client, movement]);

  const loadMore = useCallback(() => {
    if (loading || cursor == null) return;
    loadMoreController.current?.abort();
    const controller = new AbortController();
    loadMoreController.current = controller;
    setLoading(true);
    client.workouts
      .list(
        { ...serverParams, beforeId: cursor },
        { signal: controller.signal },
      )
      .then((res) => {
        if (controller.signal.aborted) return;
        setItems((prev) => [...prev, ...res.items]);
        setCursor(res.next_cursor);
        setLoading(false);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(true);
          setLoading(false);
        }
        void err;
      });
  }, [client, serverParams, cursor, loading]);

  // Infinite-scroll sentinel.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || cursor == null) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, loadMore]);

  // Re-scope ids are still loading (banner already claims a movement filter, so
  // hide the unfiltered set until the id set arrives rather than flashing it).
  const movementLoading =
    movement != null && movementWorkoutIds === null && !movementError;

  // Client-side filtering (tag split + movement re-scope).
  const visible = useMemo(() => {
    if (movement && movementWorkoutIds === null) return [];
    return items.filter((w) => {
      if (filters.tag === "tags-only" && !w.is_tag) return false;
      if (filters.tag === "no-tags" && w.is_tag) return false;
      if (movement && movementWorkoutIds && !movementWorkoutIds.has(w.id))
        return false;
      return true;
    });
  }, [items, filters.tag, movement, movementWorkoutIds]);

  const groups = useMemo(() => groupByDate(visible), [visible]);

  const hasMore = cursor != null;
  const dateFiltered = filters.dateFrom !== "" || filters.dateTo !== "";
  const anyFilterActive =
    filters.sessionType !== null ||
    filters.partner !== "all" ||
    dateFiltered ||
    filters.tag !== "all" ||
    movement != null;
  const busy = loading || movementLoading;
  const emptyFinal = !busy && visible.length === 0 && !hasMore;
  const emptyButMore = !busy && visible.length === 0 && hasMore;

  return (
    <div className="pb-nav-safe-fab mx-auto w-full max-w-[900px] px-4 pt-4 md:pb-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1
          className="font-data text-[18px] font-semibold"
          style={{ color: "var(--text)" }}
        >
          git log
        </h1>
        <HistoryFilters value={filters} onChange={setFilters} />
      </div>

      {movement && (
        <div
          className="mb-3 flex items-center justify-between gap-2 rounded-[8px] px-3 py-2"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--accent)",
          }}
        >
          <span
            className="font-sans text-[12px]"
            style={{ color: "var(--text)" }}
          >
            Showing workouts with{" "}
            <span style={{ color: "var(--accent)" }}>{movement.name}</span>
          </span>
          <button
            type="button"
            onClick={() => setMovement(null)}
            aria-label="Clear movement filter"
            className="font-sans text-[12px]"
            style={{ color: "var(--muted)" }}
          >
            Clear ×
          </button>
        </div>
      )}

      {error && (
        <div className="mb-3">
          <button
            type="button"
            onClick={() => {
              setError(false);
              setReloadKey((k) => k + 1);
            }}
            className="font-sans text-[13px]"
            style={{ color: "var(--red)" }}
          >
            Couldn&apos;t load history — retry
          </button>
        </div>
      )}

      {movementError && (
        <p
          className="mb-3 font-sans text-[13px]"
          style={{ color: "var(--red)" }}
        >
          Couldn&apos;t load this movement&apos;s history — clear the filter and
          try again.
        </p>
      )}

      {emptyFinal && !error && !movementError && (
        <div
          className="rounded-[10px] p-8 text-center"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          {anyFilterActive ? (
            <p
              className="font-sans text-[14px]"
              style={{ color: "var(--text)" }}
            >
              No workouts match your filters.
            </p>
          ) : (
            <>
              <p
                className="font-sans text-[14px]"
                style={{ color: "var(--text)" }}
              >
                No workouts yet. Tap Commit to log your first.
              </p>
              <Link
                href="/log"
                className="mt-3 inline-block rounded-[8px] px-4 py-2 font-sans text-[13px] font-semibold"
                style={{ background: "var(--accent)", color: "var(--bg)" }}
              >
                Commit a workout
              </Link>
            </>
          )}
        </div>
      )}

      {emptyButMore && (
        <p
          className="py-4 text-center font-sans text-[13px]"
          style={{ color: "var(--muted)" }}
        >
          {dateFiltered
            ? "Keep scrolling — there may be older matches."
            : "Loading more…"}
        </p>
      )}

      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <section key={group.date}>
            <h2
              className="mb-2 font-mono text-[12px] uppercase tracking-wide"
              style={{ color: "var(--muted)" }}
            >
              {relativeDate(group.date)}
            </h2>
            <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2">
              {group.workouts.map((w) =>
                w.is_tag ? (
                  <TagMilestoneCard key={w.id} workout={w} />
                ) : (
                  <WorkoutSummaryCard
                    key={w.id}
                    workout={w}
                    client={client}
                    units={units}
                  />
                ),
              )}
            </div>
          </section>
        ))}
      </div>

      {hasMore && <div ref={sentinelRef} aria-hidden className="h-6" />}
      {busy && (
        <p
          className="py-4 text-center font-sans text-[13px]"
          style={{ color: "var(--muted)" }}
        >
          Loading…
        </p>
      )}
    </div>
  );
}

function groupByDate(
  items: WorkoutSummary[],
): { date: string; workouts: WorkoutSummary[] }[] {
  const groups: { date: string; workouts: WorkoutSummary[] }[] = [];
  for (const w of items) {
    const date = localDateKey(w.performed_at);
    const last = groups[groups.length - 1];
    if (last && last.date === date) last.workouts.push(w);
    else groups.push({ date, workouts: [w] });
  }
  return groups;
}
