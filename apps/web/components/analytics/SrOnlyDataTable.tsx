/**
 * Visually-hidden data table — the screen-reader fallback every chart in
 * this domain ships alongside its SVG (04-records-and-analytics.md,
 * "Cross-cutting conventions" / "Every chart exposes a screen-reader
 * equivalent"). The SVG chart gets `aria-hidden="true"` at its call site;
 * this table carries the same data as real, navigable table markup for AT
 * users.
 *
 * NOTE: this project also has `components/shared/chart-data-table.tsx`
 * (`ChartDataTable`), a foundation-layer component with the same purpose and
 * a slightly different prop shape (columns as plain strings, rows as
 * `Array<Array<string | number>>`). Prefer `ChartDataTable` for new charts —
 * this generic-column-accessor variant stays only because another
 * in-flight component already depends on it; consolidating the two is a
 * good follow-up once all in-flight branches land.
 */
export interface SrOnlyColumn<T> {
  header: string;
  cell: (row: T) => string;
}

interface Props<T> {
  caption: string;
  columns: SrOnlyColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
}

export function SrOnlyDataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
}: Props<T>) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.header} scope="col">
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={rowKey(row)}>
            {columns.map((col) => (
              <td key={col.header}>{col.cell(row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
