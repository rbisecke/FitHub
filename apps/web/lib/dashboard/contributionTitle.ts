export interface DayAggregate {
  count: number;
  sum: number;
}

/**
 * Aggregate per-workout weighted dates into per-calendar-day totals, keyed by
 * `date.toDateString()`. Powers the contribution-graph cell tooltips so each
 * cell carries its magnitude (count + summed metric), not colour alone — the
 * accessibility fallback for colour-blind users.
 */
export function aggregateByDay(
  weightedDates: { date: Date; weight: number }[],
): Map<string, DayAggregate> {
  const byDay = new Map<string, DayAggregate>();
  for (const { date, weight } of weightedDates) {
    const key = date.toDateString();
    const current = byDay.get(key) ?? { count: 0, sum: 0 };
    current.count += 1;
    current.sum += weight;
    byDay.set(key, current);
  }
  return byDay;
}
