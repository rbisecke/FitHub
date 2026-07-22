/**
 * Shared formatting helpers for the cost/usage dashboard (`08` §7). Cost
 * figures span from sub-cent per-token charges up to hundreds of dollars, so
 * a single `toFixed(2)` either truncates tiny charges to "$0.00" (dishonest —
 * looks like no cost at all) or over-precises large ones. `formatUsd` picks
 * enough precision to keep small-but-real values visible without cluttering
 * the common case.
 */
export function formatUsd(n: number): string {
  if (n === 0) return "$0.00";
  const abs = Math.abs(n);
  if (abs < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

/** Exact, comma-grouped token counts — an invoice line item shows the real
 * quantity, not an abbreviated "1.2M". */
export function formatTokenCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatUnitPrice(perMtok: number): string {
  return `$${perMtok.toFixed(2)}/M tok`;
}

export function formatPercent(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

export function formatMs(n: number | null): string {
  return n == null ? "—" : `${Math.round(n)}ms`;
}

export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}
