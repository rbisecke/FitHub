/**
 * Per-message timestamp formatting for the coach chat transcript
 * (design-spec 03 — no per-message time was previously surfaced, only the
 * session-list's recency-bucket heading). `created_at` on history messages
 * is a full ISO timestamp (not a date-only string), so `new Date(iso)` is
 * safe here — the local-parts-decomposition rule (apps/web/CLAUDE.md) only
 * applies to date-ONLY strings like "2025-03-15".
 */
export function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
