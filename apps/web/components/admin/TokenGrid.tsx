import type { AdminTokenTypeBreakdown } from "@/lib/api";
import {
  formatTokenCount,
  formatUnitPrice,
  formatUsd,
} from "@/lib/admin/cost-format";

interface Props {
  breakdown: AdminTokenTypeBreakdown[];
}

// Fixed display order + labels + fallback pricing (`08` §7 — the hardcoded
// Haiku 4.5 table). The fallback prices only ever render when the backend
// has zero rows to report (a brand-new deployment with no non-stub LLM
// calls yet) so the empty state still shows the real per-type pricing
// rather than blank dashes.
const ROW_ORDER: {
  type: AdminTokenTypeBreakdown["token_type"];
  label: string;
  fallbackPrice: number;
}[] = [
  { type: "input", label: "Input tokens", fallbackPrice: 1.0 },
  { type: "output", label: "Output tokens", fallbackPrice: 5.0 },
  { type: "cache_read", label: "Cache read", fallbackPrice: 0.1 },
  { type: "cache_write", label: "Cache write", fallbackPrice: 1.25 },
];

/**
 * Cost breakdown — Vercel invoice format (`08` §7, item 3). One row per
 * token type with Quantity / Unit price / Charge, rolling to a subtotal.
 * Replaces the old `totals={null}` all-zeros 4-card grid stub.
 */
export function TokenGrid({ breakdown }: Props) {
  const byType = new Map(breakdown.map((row) => [row.token_type, row]));

  const rows = ROW_ORDER.map(({ type, label, fallbackPrice }) => {
    const row = byType.get(type);
    return {
      label,
      quantity: row?.quantity ?? 0,
      unitPrice: row?.unit_price_per_mtok ?? fallbackPrice,
      charge: row?.charge_usd ?? 0,
    };
  });

  const subtotal = rows.reduce((sum, r) => sum + r.charge, 0);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)]">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <h2 className="type-h3 text-[var(--text)]">Cost breakdown</h2>
        <p className="type-caption mt-0.5 text-[var(--muted)]">
          Token usage · last 30 days
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left">
              <th className="px-5 py-2 font-normal text-[var(--muted)]">
                Token type
              </th>
              <th className="px-5 py-2 text-right font-normal text-[var(--muted)]">
                Quantity
              </th>
              <th className="px-5 py-2 text-right font-normal text-[var(--muted)]">
                Unit price
              </th>
              <th className="px-5 py-2 text-right font-normal text-[var(--muted)]">
                Charge
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className="border-b border-[var(--border)] last:border-b-0"
              >
                <td className="px-5 py-2.5 font-sans text-[var(--text)]">
                  {row.label}
                </td>
                <td className="px-5 py-2.5 text-right tabular-nums text-[var(--text)]">
                  {formatTokenCount(row.quantity)}
                </td>
                <td className="px-5 py-2.5 text-right tabular-nums text-[var(--muted)]">
                  {formatUnitPrice(row.unitPrice)}
                </td>
                <td className="px-5 py-2.5 text-right tabular-nums text-[var(--text)]">
                  {formatUsd(row.charge)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--text)]">
              <td
                colSpan={3}
                className="px-5 pb-2.5 pt-4 text-right font-sans font-semibold text-[var(--text)]"
              >
                Subtotal
              </td>
              <td className="px-5 pb-2.5 pt-4 text-right text-base font-semibold tabular-nums text-[var(--text)]">
                {formatUsd(subtotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="border-t border-[var(--border)] px-5 py-2 font-mono text-xs text-[var(--muted)]">
        Pricing: Haiku 4.5 — hardcoded, hand-maintained rates
      </p>
    </div>
  );
}
