export function parseTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  if (digits.length <= 2) {
    const s = parseInt(digits, 10);
    if (s < 60) return `0:${String(s).padStart(2, "0")}`;
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }
  const secs = parseInt(digits.slice(-2), 10);
  const mins = parseInt(digits.slice(0, -2), 10);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function timeTextToSeconds(normalised: string): number | null {
  const match = normalised.match(/^(\d+):(\d{2})$/);
  if (!match) return null;
  return parseInt(match[1]!, 10) * 60 + parseInt(match[2]!, 10);
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * "3m ago" / "2h ago" / "Yesterday" / "5d ago" from a full ISO timestamp
 * (not a date-only string — this always carries a time + zone, e.g. the
 * `to_char(... , 'YYYY-MM-DD"T"HH24:MI:SS"Z"')` shape the integrations API
 * returns for `last_synced_at`, so `new Date(iso)` is safe here; the
 * date-only-string parsing rule only applies to bare `YYYY-MM-DD` values).
 * Mirrors the notification panel's local `relativeTime` — kept here so any
 * screen with a "last synced"/"last seen" style timestamp can share it.
 */
export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffM = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMs / 3_600_000);
  const diffD = Math.floor(diffMs / 86_400_000);
  if (diffM < 1) return "just now";
  if (diffM < 60) return `${diffM}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD === 1) return "Yesterday";
  return `${diffD}d ago`;
}
