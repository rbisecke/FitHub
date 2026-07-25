import { cn } from "@/lib/utils";

/**
 * Screen-reader data-table for charts (0.17, 09 §1, 04 accessibility conventions).
 *
 * MANDATORY pairing for every chart, no exceptions: the visual SVG is marked
 * `aria-hidden="true"` and this component renders a visually-hidden (`sr-only`)
 * `<table>` built from the SAME data array driving the chart, with a `<caption>` and
 * proper `<th scope>` cells. Screen-reader users get the numbers; sighted users get
 * the SVG. Presentational — safe in Server Components.
 *
 * The first column of each row is treated as the row header (`<th scope="row">`).
 */
export function ChartDataTable({
  caption,
  columns,
  rows,
  className,
}: {
  caption: string;
  columns: string[];
  rows: Array<Array<string | number>>;
  className?: string;
}) {
  return (
    // `table-fixed` (not just `sr-only`'s `width: 1px`) — `<table>` uses
    // `table-layout: auto` by default, which sizes the table to its content's
    // min-content width and ignores an explicit `width` entirely. With wide
    // content (long chart rows, many columns) that intrinsic width can reach
    // several hundred px even though the table is visually hidden, which
    // then contributes to the PAGE's scrollable width on mobile (a real,
    // measurable horizontal-scroll bug — not just a screen-reader-only
    // concern). `table-fixed` makes the table actually honor `width: 1px`.
    <table className={cn("sr-only table-fixed", className)}>
      {/* `whitespace-normal` overrides the `white-space: nowrap` this
          `<caption>` otherwise inherits from `.sr-only` on the parent
          `<table>`. A long, unwrappable caption forces the whole table's
          rendered box to grow to the caption's full text width to contain
          it — even with `table-fixed` — which alone reproduced the exact
          mobile horizontal-overflow bug this table exists to avoid causing. */}
      <caption className="whitespace-normal">{caption}</caption>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col} scope="col">
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => {
          const [head, ...rest] = row;
          // Keyed by row index, not the displayed first-column text: this is a
          // static presentational snapshot (never reordered), and two rows can
          // legitimately share the same displayed label — e.g. two benchmark
          // attempts logged on the same calendar day — which would otherwise
          // collide on a text-derived key.
          return (
            <tr key={ri}>
              <th scope="row">{head}</th>
              {rest.map((cell, ci) => (
                <td key={`${ri}-${columns[ci + 1] ?? ci}`}>{cell}</td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
