"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { createApiClient } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileStatsHeader } from "@/components/records/ProfileStatsHeader";
import { RecordsSortFilter } from "@/components/records/RecordsSortFilter";
import { RecordsPRCard } from "@/components/records/RecordsPRCard";
import { EmptyRecordsPanel } from "@/components/records/EmptyRecordsPanel";
import { groupRecordsByMovement } from "@/lib/records/groupByMovement";
import {
  sortMovementGroups,
  type RecordsSortOrder,
} from "@/lib/records/sortRecords";
import type { PersonalRecord } from "@/lib/api";
import type { WeightUnit } from "@/lib/records/prFormat";

/**
 * Records Home (design-spec 04 Screen 1, `/progress/records`). Dark
 * glance-and-celebrate surface. Note this screen is only the PR-list
 * *section* of the Progress tab's Records segment — Domain 07's contribution
 * graph and streak display render above it (see the layout slot in this
 * route's `page.tsx`), not built here.
 */
export function RecordsHomeScreen({
  token,
  weightUnit,
  initialData,
  initialLoadFailed,
}: {
  token: string;
  weightUnit: WeightUnit;
  initialData: PersonalRecord[] | null;
  initialLoadFailed: boolean;
}) {
  const client = useMemo(() => createApiClient(token), [token]);
  const [data, setData] = useState<PersonalRecord[] | null>(initialData);
  const [loading, setLoading] = useState(
    initialData === null && !initialLoadFailed,
  );
  const [error, setError] = useState(initialLoadFailed);
  const [retryKey, setRetryKey] = useState(0);
  const [sortOrder, setSortOrder] =
    useState<RecordsSortOrder>("recently_moved");
  const [staleOnly, setStaleOnly] = useState(false);

  useEffect(() => {
    if (initialData !== null && retryKey === 0) return;
    const controller = new AbortController();
    let cancelled = false;
    client.analytics
      .personalRecords({ signal: controller.signal })
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(false);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled || controller.signal.aborted) return;
        setError(true);
        setLoading(false);
        void err;
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey, client]);

  function handleRetry() {
    setError(false);
    setLoading(true);
    setRetryKey((k) => k + 1);
  }

  const records = useMemo(() => data ?? [], [data]);
  const filtered = staleOnly ? records.filter((r) => r.is_stale) : records;
  const groups = useMemo(
    () => sortMovementGroups(groupRecordsByMovement(filtered), sortOrder),
    [filtered, sortOrder],
  );

  const totalPrs = records.length;
  const movementsTracked = useMemo(
    () => new Set(records.map((r) => r.movement_id)).size,
    [records],
  );

  return (
    <div className="min-h-svh bg-[var(--bg)] text-[var(--text)] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-2xl space-y-5">
        <div>
          <h1 className="font-sans text-[20px] font-bold text-[var(--text)]">
            Records
          </h1>
          <p className="font-sans text-[13px] text-[var(--muted)] mt-1">
            Your all-time bests, and which lifts are moving right now
          </p>
        </div>

        {loading ? (
          <div className="space-y-5">
            <div className="flex gap-8">
              <Skeleton className="h-12 w-16 rounded-[6px]" />
              <Skeleton className="h-12 w-24 rounded-[6px]" />
            </div>
            <div className="flex flex-col gap-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[86px] w-full rounded-[10px]" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-start gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
            <p className="font-sans text-[13px] text-[var(--red)]">
              Couldn&apos;t load your records. Please try again.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="flex h-11 items-center gap-1.5 rounded-[8px] border border-[var(--border)] px-3 font-sans text-[13px] font-medium text-[var(--text)]"
            >
              <RefreshCw size={14} aria-hidden="true" />
              Retry
            </button>
          </div>
        ) : records.length === 0 ? (
          <>
            <ProfileStatsHeader totalPrs={0} movementsTracked={0} />
            <EmptyRecordsPanel />
          </>
        ) : (
          <>
            <ProfileStatsHeader
              totalPrs={totalPrs}
              movementsTracked={movementsTracked}
            />
            <RecordsSortFilter
              sortOrder={sortOrder}
              onSortChange={setSortOrder}
              staleOnly={staleOnly}
              onStaleOnlyChange={setStaleOnly}
            />
            {groups.length === 0 ? (
              <p
                className="font-sans text-[13px]"
                style={{ color: "var(--muted)" }}
              >
                No stale movements right now — everything&apos;s current.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {groups.map((group) => (
                  <RecordsPRCard
                    key={group.movementId}
                    group={group}
                    unit={weightUnit}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
