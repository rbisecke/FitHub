/**
 * Shared local-date helpers for the plan overview (02 §4, §5). Every
 * date-only value in this domain ("YYYY-MM-DD") must be decomposed into
 * local parts, never passed through `new Date(isoString)` — that parses as
 * UTC midnight and can silently shift the calendar day (apps/web/CLAUDE.md).
 */

export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(y, m - 1, d);
}

export function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayLocalDateString(): string {
  return localDateString(new Date());
}

// Calendar-day difference between two local dates, DST-safe. Subtracting
// local Date objects directly and dividing by a fixed 24h-in-ms constant
// undercounts across a DST transition (a "day" can be 23 or 25 real hours);
// converting each date's Y/M/D triple to a UTC-anchored timestamp first
// sidesteps the DST shift entirely — every "day" is exactly 24h in UTC.
function calendarDayDiff(from: Date, to: Date): number {
  const utcFrom = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const utcTo = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((utcTo - utcFrom) / (1000 * 60 * 60 * 24));
}

/** 1-indexed plan week containing a given local date-only string. */
export function weekNumberForDate(
  scheduledDate: string,
  planStart: Date,
): number {
  const dayDiff = calendarDayDiff(planStart, parseLocalDate(scheduledDate));
  return Math.max(1, Math.floor(dayDiff / 7) + 1);
}

export function formatShortDate(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
