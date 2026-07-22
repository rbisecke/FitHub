/**
 * Recency-bucket grouping for the session list (design-spec 03 §5): Today /
 * Yesterday / Previous 7 days / Older. Sessions arrive already ordered by the
 * server (`updated_at DESC`) — this only partitions them into buckets, it never
 * re-sorts, so within-bucket order is preserved.
 *
 * Buckets by `updated_at`, not `created_at` — the whole point of the server's
 * `updated_at DESC` ordering is that a session which just got a new reply
 * resurfaces at the top of the list, but a bucket function keyed on the
 * (unchanging) creation date would still file that session under "Older" the
 * moment it's more than a week old, defeating the resurfacing entirely.
 *
 * Bucketing is by local calendar day (apps/web/CLAUDE.md date-handling rule):
 * `updated_at` is a full ISO timestamp (not a date-only string), so
 * `new Date(iso)` is safe here — the local-parts pitfall only applies to
 * date-ONLY strings like "2025-03-15". "Today" is computed from the caller-
 * supplied `now` so it can't go stale in a long-lived tab; pass `new Date()`
 * at render/call time, not a memoized constant.
 */

export type RecencyBucket = "Today" | "Yesterday" | "Previous 7 days" | "Older";

const BUCKET_ORDER: RecencyBucket[] = [
  "Today",
  "Yesterday",
  "Previous 7 days",
  "Older",
];

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function bucketForDate(updatedAt: string, now: Date): RecencyBucket {
  const updatedMs = startOfLocalDay(new Date(updatedAt));
  const todayMs = startOfLocalDay(now);
  const diffDays = Math.round((todayMs - updatedMs) / 86_400_000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 7) return "Previous 7 days";
  return "Older";
}

export interface RecencyGroup<T> {
  bucket: RecencyBucket;
  sessions: T[];
}

export function groupSessionsByRecency<T extends { updated_at: string }>(
  sessions: T[],
  now: Date = new Date(),
): RecencyGroup<T>[] {
  const byBucket = new Map<RecencyBucket, T[]>(
    BUCKET_ORDER.map((b) => [b, []]),
  );
  for (const session of sessions) {
    byBucket.get(bucketForDate(session.updated_at, now))?.push(session);
  }
  return BUCKET_ORDER.map((bucket) => ({
    bucket,
    sessions: byBucket.get(bucket) ?? [],
  })).filter((group) => group.sessions.length > 0);
}
