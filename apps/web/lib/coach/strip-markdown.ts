/**
 * Best-effort plain-text rendering of the assistant's markdown answer, for the
 * `aria-live="polite"` announcement (design-spec 03 §0.5) — a screen reader
 * should hear "deload" once, not "asterisk asterisk deload asterisk asterisk".
 * Not a full markdown parser; strips the handful of inline/block markers the
 * coach system prompt is told to use (**bold**, `code`, bullet/numbered lists).
 */
export function stripMarkdownForAnnouncement(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .trim();
}
