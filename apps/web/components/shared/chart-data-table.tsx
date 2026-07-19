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
    <table className={cn("sr-only", className)}>
      <caption>{caption}</caption>
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
        {rows.map((row) => {
          const [head, ...rest] = row;
          const rowKey = String(head);
          return (
            <tr key={rowKey}>
              <th scope="row">{head}</th>
              {rest.map((cell, ci) => (
                <td key={`${rowKey}-${columns[ci + 1] ?? ci}`}>{cell}</td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
